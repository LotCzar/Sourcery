import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { mockInngestSend } from "@/__tests__/mocks/inngest";
import {
  createMockUserWithRestaurant,
  createMockPOSIntegration,
} from "@/__tests__/fixtures";
import { parseResponse } from "@/__tests__/helpers";
import { POST } from "./route";

describe("POST /api/integrations/pos/sync", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when no active integration", async () => {
    const user = {
      ...createMockUserWithRestaurant(),
      restaurant: {
        ...createMockUserWithRestaurant().restaurant,
        posIntegration: null,
      },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await POST();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("No active integration found");
  });

  it("returns 404 when integration is inactive", async () => {
    const integration = createMockPOSIntegration({ isActive: false });
    const user = {
      ...createMockUserWithRestaurant(),
      restaurant: {
        ...createMockUserWithRestaurant().restaurant,
        posIntegration: integration,
      },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await POST();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("No active integration found");
  });

  it("triggers sync successfully", async () => {
    const integration = createMockPOSIntegration({ provider: "SQUARE" });
    const user = {
      ...createMockUserWithRestaurant(),
      restaurant: {
        ...createMockUserWithRestaurant().restaurant,
        posIntegration: integration,
      },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await POST();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Menu sync initiated");
    expect(mockInngestSend).toHaveBeenCalledWith({
      name: "pos/sync.requested",
      data: {
        integrationId: "pos_1",
        restaurantId: "rest_1",
        provider: "SQUARE",
      },
    });
  });
});
