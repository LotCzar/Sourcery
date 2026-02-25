import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockAuth } from "./mocks/clerk";
import { createMockUser, createMockUserWithRestaurant } from "./fixtures";
import { createRequest, createJsonRequest, parseResponse } from "./helpers";

// Mock email
const mockSendEmail = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  emailTemplates: {
    staffInvitation: (recipientName: string, restaurantName: string, role: string, inviterName: string) => ({
      subject: `Invite to ${restaurantName}`,
      html: `<p>Invite for ${recipientName}</p>`,
    }),
  },
}));

describe("Team API", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    mockSendEmail.mockClear();
  });

  describe("GET /api/team", () => {
    it("returns team members", async () => {
      const ownerUser = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValue(ownerUser as any);

      const members = [
        createMockUser({ id: "user_1", role: "OWNER", clerkId: "clerk_owner" }),
        createMockUser({ id: "user_2", role: "STAFF", clerkId: "staff_pending_abc123", firstName: "Jane", email: "jane@test.com" }),
      ];
      prismaMock.user.findMany.mockResolvedValue(members as any);

      const { GET } = await import("@/app/api/team/route");
      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].isPending).toBe(false);
      expect(data.data[1].isPending).toBe(true);
    });

    it("returns 401 for unauthenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const { GET } = await import("@/app/api/team/route");
      const response = await GET();
      const { status } = await parseResponse(response);

      expect(status).toBe(401);
    });

    it("returns 403 for STAFF role", async () => {
      const staffUser = createMockUserWithRestaurant({ role: "STAFF" });
      prismaMock.user.findUnique.mockResolvedValue(staffUser as any);

      const { GET } = await import("@/app/api/team/route");
      const response = await GET();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });
  });

  describe("POST /api/team", () => {
    it("creates a staff member with placeholder clerkId and sends email", async () => {
      const ownerUser = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(ownerUser as any);

      // No existing user with that email
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const createdMember = createMockUser({
        id: "new_member_1",
        clerkId: "staff_pending_uuid",
        email: "newstaff@test.com",
        firstName: "New",
        lastName: "Staff",
        role: "STAFF",
      });
      prismaMock.user.create.mockResolvedValue(createdMember as any);

      const { POST } = await import("@/app/api/team/route");
      const request = createJsonRequest("http://localhost/api/team", {
        firstName: "New",
        lastName: "Staff",
        email: "newstaff@test.com",
        role: "STAFF",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isPending).toBe(true);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "newstaff@test.com",
            role: "STAFF",
            restaurantId: "rest_1",
          }),
        })
      );
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "newstaff@test.com",
        })
      );
    });

    it("returns 400 if email already assigned to another restaurant", async () => {
      const ownerUser = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(ownerUser as any);

      const existingUser = createMockUser({
        email: "taken@test.com",
        restaurantId: "other_rest",
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(existingUser as any);

      const { POST } = await import("@/app/api/team/route");
      const request = createJsonRequest("http://localhost/api/team", {
        firstName: "Taken",
        email: "taken@test.com",
        role: "STAFF",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toContain("already assigned");
    });

    it("returns 403 for STAFF role", async () => {
      const staffUser = createMockUserWithRestaurant({ role: "STAFF" });
      prismaMock.user.findUnique.mockResolvedValue(staffUser as any);

      const { POST } = await import("@/app/api/team/route");
      const request = createJsonRequest("http://localhost/api/team", {
        firstName: "New",
        email: "new@test.com",
        role: "STAFF",
      });
      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(403);
    });

    it("returns validation errors for invalid input", async () => {
      const ownerUser = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValue(ownerUser as any);

      const { POST } = await import("@/app/api/team/route");
      const request = createJsonRequest("http://localhost/api/team", {
        email: "invalid-email",
        role: "INVALID",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });

  describe("PATCH /api/team/[id]", () => {
    it("updates a staff member", async () => {
      const ownerUser = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(ownerUser as any);

      const targetMember = createMockUser({
        id: "member_1",
        role: "STAFF",
        restaurantId: "rest_1",
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(targetMember as any);

      const updated = { ...targetMember, firstName: "Updated" };
      prismaMock.user.update.mockResolvedValue(updated as any);

      const { PATCH } = await import("@/app/api/team/[id]/route");
      const request = createJsonRequest("http://localhost/api/team/member_1", {
        firstName: "Updated",
      }, "PATCH");
      const response = await PATCH(request, { params: Promise.resolve({ id: "member_1" }) });
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 403 when trying to edit OWNER", async () => {
      const managerUser = createMockUserWithRestaurant({ role: "MANAGER" });
      prismaMock.user.findUnique.mockResolvedValueOnce(managerUser as any);

      const ownerMember = createMockUser({ id: "owner_1", role: "OWNER", restaurantId: "rest_1" });
      prismaMock.user.findUnique.mockResolvedValueOnce(ownerMember as any);

      const { PATCH } = await import("@/app/api/team/[id]/route");
      const request = createJsonRequest("http://localhost/api/team/owner_1", {
        firstName: "Changed",
      }, "PATCH");
      const response = await PATCH(request, { params: Promise.resolve({ id: "owner_1" }) });
      const { status, data } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error).toContain("Cannot edit the owner");
    });

    it("returns 403 for STAFF role", async () => {
      const staffUser = createMockUserWithRestaurant({ role: "STAFF" });
      prismaMock.user.findUnique.mockResolvedValue(staffUser as any);

      const { PATCH } = await import("@/app/api/team/[id]/route");
      const request = createJsonRequest("http://localhost/api/team/member_1", {
        firstName: "Changed",
      }, "PATCH");
      const response = await PATCH(request, { params: Promise.resolve({ id: "member_1" }) });
      const { status } = await parseResponse(response);

      expect(status).toBe(403);
    });
  });

  describe("DELETE /api/team/[id]", () => {
    it("deletes a pending member (staff_pending_ clerkId)", async () => {
      const ownerUser = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(ownerUser as any);

      const pendingMember = createMockUser({
        id: "pending_1",
        role: "STAFF",
        clerkId: "staff_pending_abc",
        restaurantId: "rest_1",
      });
      prismaMock.user.findUnique.mockResolvedValueOnce(pendingMember as any);
      prismaMock.user.delete.mockResolvedValue(pendingMember as any);

      const { DELETE } = await import("@/app/api/team/[id]/route");
      const request = createRequest("http://localhost/api/team/pending_1", { method: "DELETE" });
      const response = await DELETE(request, { params: Promise.resolve({ id: "pending_1" }) });
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "pending_1" } });
    });

    it("returns 403 when trying to remove OWNER", async () => {
      const managerUser = createMockUserWithRestaurant({ role: "MANAGER" });
      prismaMock.user.findUnique.mockResolvedValueOnce(managerUser as any);

      const ownerMember = createMockUser({ id: "owner_1", role: "OWNER", restaurantId: "rest_1" });
      prismaMock.user.findUnique.mockResolvedValueOnce(ownerMember as any);

      const { DELETE } = await import("@/app/api/team/[id]/route");
      const request = createRequest("http://localhost/api/team/owner_1", { method: "DELETE" });
      const response = await DELETE(request, { params: Promise.resolve({ id: "owner_1" }) });
      const { status, data } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error).toContain("Cannot remove the owner");
    });
  });
});
