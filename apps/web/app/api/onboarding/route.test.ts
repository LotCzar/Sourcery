import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth, mockCurrentUser } from "@/__tests__/mocks/clerk";
import { createMockUser, createMockRestaurant } from "@/__tests__/fixtures";
import { createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { POST } from "./route";

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    mockCurrentUser.mockResolvedValue({
      id: "clerk_test_user_123",
      firstName: "Test",
      lastName: "User",
      emailAddresses: [{ emailAddress: "test@restaurant.com" }],
    });
  });

  it("returns 401 when unauthenticated (no auth)", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const request = createJsonRequest("http://localhost/api/onboarding", {
      restaurantName: "My Restaurant",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when currentUser returns null", async () => {
    mockCurrentUser.mockResolvedValueOnce(null);

    const request = createJsonRequest("http://localhost/api/onboarding", {
      restaurantName: "My Restaurant",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("creates user (upsert), restaurant, and links them", async () => {
    const dbUser = createMockUser();
    const restaurant = createMockRestaurant({ name: "New Place" });

    prismaMock.user.upsert.mockResolvedValueOnce(dbUser as any);
    prismaMock.restaurant.create.mockResolvedValueOnce(restaurant as any);
    prismaMock.user.update.mockResolvedValueOnce(dbUser as any);

    const request = createJsonRequest("http://localhost/api/onboarding", {
      restaurantName: "New Place",
      address: "123 Main St",
      city: "Austin",
      state: "TX",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.restaurant.name).toBe("New Place");
    expect(prismaMock.user.upsert).toHaveBeenCalled();
    expect(prismaMock.restaurant.create).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: { restaurantId: restaurant.id },
      })
    );
  });

  it("maps seatingCapacity string ranges to numbers", async () => {
    const dbUser = createMockUser();
    const restaurant = createMockRestaurant();

    prismaMock.user.upsert.mockResolvedValueOnce(dbUser as any);
    prismaMock.restaurant.create.mockResolvedValueOnce(restaurant as any);
    prismaMock.user.update.mockResolvedValueOnce(dbUser as any);

    const request = createJsonRequest("http://localhost/api/onboarding", {
      restaurantName: "Test",
      seatingCapacity: "51-100",
    });
    await POST(request);

    expect(prismaMock.restaurant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seatingCapacity: 100,
        }),
      })
    );
  });

  it("returns success with restaurant id and name", async () => {
    const dbUser = createMockUser();
    const restaurant = createMockRestaurant({ id: "rest_new", name: "Success Restaurant" });

    prismaMock.user.upsert.mockResolvedValueOnce(dbUser as any);
    prismaMock.restaurant.create.mockResolvedValueOnce(restaurant as any);
    prismaMock.user.update.mockResolvedValueOnce(dbUser as any);

    const request = createJsonRequest("http://localhost/api/onboarding", {
      restaurantName: "Success Restaurant",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data).toEqual({
      success: true,
      restaurant: { id: "rest_new", name: "Success Restaurant" },
    });
  });
});
