import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUser } from "@/__tests__/fixtures";
import { parseResponse } from "@/__tests__/helpers";
import { GET } from "./route";

describe("GET /api/user/context", () => {
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

  it("returns userId and restaurantId when user has restaurant", async () => {
    const user = {
      ...createMockUser(),
      restaurant: { id: "rest_1" },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.userId).toBe("user_1");
    expect(data.data.restaurantId).toBe("rest_1");
  });

  it("returns restaurantId as null when user has no restaurant", async () => {
    const user = {
      ...createMockUser(),
      restaurant: null,
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.userId).toBe("user_1");
    expect(data.data.restaurantId).toBeNull();
  });
});
