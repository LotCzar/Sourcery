import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockAuth, mockCurrentUser } from "./mocks/clerk";
import {
  createMockUser,
  createMockOrganization,
  createMockRestaurant,
  createMockOrgAdmin,
} from "./fixtures";
import { createJsonRequest, parseResponse } from "./helpers";

describe("Organization Onboarding API", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    mockCurrentUser.mockResolvedValue({
      id: "clerk_test_user_123",
      firstName: "Test",
      lastName: "User",
      emailAddresses: [{ emailAddress: "test@restaurant.com" }],
    });
  });

  describe("POST /api/onboarding/organization", () => {
    it("creates org, restaurant, and ORG_ADMIN user", async () => {
      // No existing org with this slug
      prismaMock.organization.findUnique.mockResolvedValue(null);

      const org = createMockOrganization({ id: "org_new" });
      prismaMock.organization.create.mockResolvedValue(org as any);

      const restaurant = createMockRestaurant({ id: "rest_new", organizationId: "org_new" });
      prismaMock.restaurant.create.mockResolvedValue(restaurant as any);

      const user = createMockUser({
        role: "ORG_ADMIN",
        organizationId: "org_new",
        restaurantId: "rest_new",
      });
      prismaMock.user.upsert.mockResolvedValue(user as any);

      const { POST } = await import("@/app/api/onboarding/organization/route");
      const request = createJsonRequest("http://localhost/api/onboarding/organization", {
        organizationName: "Test Restaurant Group",
        slug: "test-group",
        restaurantName: "Main Location",
        city: "Austin",
        state: "TX",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.organization.slug).toBe("test-group");
      expect(data.restaurant.name).toBe("Test Restaurant");

      expect(prismaMock.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Test Restaurant Group",
            slug: "test-group",
          }),
        })
      );

      expect(prismaMock.restaurant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org_new",
          }),
        })
      );

      expect(prismaMock.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            role: "ORG_ADMIN",
            organizationId: "org_new",
          }),
        })
      );
    });

    it("rejects duplicate slug", async () => {
      const existingOrg = createMockOrganization({ slug: "test-group" });
      prismaMock.organization.findUnique.mockResolvedValue(existingOrg as any);

      const { POST } = await import("@/app/api/onboarding/organization/route");
      const request = createJsonRequest("http://localhost/api/onboarding/organization", {
        organizationName: "Test Group",
        slug: "test-group",
        restaurantName: "Main Location",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toContain("slug is already taken");
    });

    it("returns validation errors for missing fields", async () => {
      const { POST } = await import("@/app/api/onboarding/organization/route");
      const request = createJsonRequest("http://localhost/api/onboarding/organization", {
        organizationName: "",
        slug: "",
        restaurantName: "",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("returns 401 for unauthenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const { POST } = await import("@/app/api/onboarding/organization/route");
      const request = createJsonRequest("http://localhost/api/onboarding/organization", {
        organizationName: "Test",
        slug: "test",
        restaurantName: "Location",
      });
      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(401);
    });
  });

  describe("POST /api/org/restaurants", () => {
    it("creates a new restaurant in the org", async () => {
      const orgAdmin = createMockOrgAdmin();
      prismaMock.user.findUnique.mockResolvedValue(orgAdmin as any);

      const newRestaurant = createMockRestaurant({
        id: "rest_new",
        name: "New Location",
        organizationId: "org_1",
      });
      prismaMock.restaurant.create.mockResolvedValue(newRestaurant as any);

      const { POST } = await import("@/app/api/org/restaurants/route");
      const request = createJsonRequest("http://localhost/api/org/restaurants", {
        restaurantName: "New Location",
        city: "Austin",
        state: "TX",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(prismaMock.restaurant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Location",
            organizationId: "org_1",
          }),
        })
      );
    });

    it("rejects non-ORG_ADMIN users", async () => {
      const regularUser = createMockUser({ role: "OWNER" });
      prismaMock.user.findUnique.mockResolvedValue(regularUser as any);

      const { POST } = await import("@/app/api/org/restaurants/route");
      const request = createJsonRequest("http://localhost/api/org/restaurants", {
        restaurantName: "New Location",
      });
      const response = await POST(request);
      const { status } = await parseResponse(response);

      expect(status).toBe(403);
    });

    it("returns validation errors for missing restaurant name", async () => {
      const orgAdmin = createMockOrgAdmin();
      prismaMock.user.findUnique.mockResolvedValue(orgAdmin as any);

      const { POST } = await import("@/app/api/org/restaurants/route");
      const request = createJsonRequest("http://localhost/api/org/restaurants", {
        restaurantName: "",
      });
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });
});
