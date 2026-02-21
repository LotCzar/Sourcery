import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockPOSIntegration,
} from "@/__tests__/fixtures";
import { createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { GET, POST } from "./route";

describe("GET /api/integrations/pos", () => {
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

  it("returns 404 when restaurant not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user_1",
      restaurant: null,
    } as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns null when no integration exists", async () => {
    const user = {
      ...createMockUserWithRestaurant(),
      restaurant: {
        ...createMockUserWithRestaurant().restaurant,
        posIntegration: null,
      },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeNull();
  });

  it("returns integration without tokens", async () => {
    const integration = createMockPOSIntegration({
      accessToken: "secret_token",
      refreshToken: "secret_refresh",
    });
    const user = {
      ...createMockUserWithRestaurant(),
      restaurant: {
        ...createMockUserWithRestaurant().restaurant,
        posIntegration: integration,
      },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.provider).toBe("MANUAL");
    expect(data.data.isActive).toBe(true);
    expect(data.data).not.toHaveProperty("accessToken");
    expect(data.data).not.toHaveProperty("refreshToken");
  });
});

describe("POST /api/integrations/pos", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const request = createJsonRequest("http://localhost/api/integrations/pos", {
      provider: "MANUAL",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid provider", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const request = createJsonRequest("http://localhost/api/integrations/pos", {
      provider: "INVALID",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("connects MANUAL provider successfully", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const integration = createMockPOSIntegration();
    prismaMock.pOSIntegration.upsert.mockResolvedValueOnce(integration as any);

    const request = createJsonRequest("http://localhost/api/integrations/pos", {
      provider: "MANUAL",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.provider).toBe("MANUAL");
    expect(prismaMock.pOSIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: "rest_1" },
        create: expect.objectContaining({ provider: "MANUAL" }),
      })
    );
  });

  it("returns 503 for unconfigured OAuth provider", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const request = createJsonRequest("http://localhost/api/integrations/pos", {
      provider: "SQUARE",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(503);
    expect(data.error).toContain("SQUARE integration is not configured");
  });
});
