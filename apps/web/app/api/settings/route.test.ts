import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockUserWithRestaurant,
  createMockRestaurant,
} from "@/__tests__/fixtures";
import { createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { GET, PATCH } from "./route";

describe("GET /api/settings", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns user, restaurant, and preferences", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.id).toBe("user_1");
    expect(data.data.user.email).toBe("test@restaurant.com");
    expect(data.data.restaurant.name).toBe("Test Restaurant");
    expect(data.data.preferences).toEqual({
      emailNotifications: true,
      orderUpdates: true,
      priceAlerts: true,
      weeklyReport: true,
    });
  });
});

describe("PATCH /api/settings", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const request = createJsonRequest("http://localhost/api/settings", {
      section: "profile",
      data: { firstName: "New" },
    }, "PATCH");
    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("updates profile section", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.user.update.mockResolvedValueOnce(user as any);

    const request = createJsonRequest("http://localhost/api/settings", {
      section: "profile",
      data: { firstName: "Updated", lastName: "Name" },
    }, "PATCH");
    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: { firstName: "Updated", lastName: "Name" },
      })
    );
  });

  it("updates restaurant section", async () => {
    const user = createMockUserWithRestaurant();
    const restaurant = createMockRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.restaurant.update.mockResolvedValueOnce(restaurant as any);

    const request = createJsonRequest("http://localhost/api/settings", {
      section: "restaurant",
      data: { name: "Updated Restaurant", phone: "555-1234" },
    }, "PATCH");
    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.restaurant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rest_1" },
      })
    );
  });

  it("returns 404 when updating restaurant but user has no restaurant", async () => {
    const user = createMockUser({ restaurant: null });
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...user, restaurant: null } as any);

    const request = createJsonRequest("http://localhost/api/settings", {
      section: "restaurant",
      data: { name: "New Name" },
    }, "PATCH");
    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns 400 for invalid section name", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const request = createJsonRequest("http://localhost/api/settings", {
      section: "invalid_section",
      data: {},
    }, "PATCH");
    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Invalid settings section");
  });
});
