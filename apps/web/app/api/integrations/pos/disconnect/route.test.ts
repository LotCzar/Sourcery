import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockPOSIntegration,
} from "@/__tests__/fixtures";
import { parseResponse } from "@/__tests__/helpers";
import { POST } from "./route";

describe("POST /api/integrations/pos/disconnect", () => {
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

  it("returns 404 when no integration exists", async () => {
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
    expect(data.error).toBe("No integration found");
  });

  it("disconnects successfully", async () => {
    const integration = createMockPOSIntegration();
    const user = {
      ...createMockUserWithRestaurant(),
      restaurant: {
        ...createMockUserWithRestaurant().restaurant,
        posIntegration: integration,
      },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.pOSIntegration.delete.mockResolvedValueOnce(integration as any);

    const response = await POST();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Integration disconnected");
    expect(prismaMock.pOSIntegration.delete).toHaveBeenCalledWith({
      where: { id: "pos_1" },
    });
  });
});
