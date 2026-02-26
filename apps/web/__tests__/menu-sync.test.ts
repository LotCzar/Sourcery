import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { createMockPOSIntegration, createMockMenuItem, createMockUser } from "./fixtures";

const { mockFetchMenuItems, mockRefreshAccessToken } = vi.hoisted(() => ({
  mockFetchMenuItems: vi.fn(),
  mockRefreshAccessToken: vi.fn(),
}));

vi.mock("@/lib/pos", () => ({
  getAdapter: vi.fn().mockResolvedValue({
    fetchMenuItems: mockFetchMenuItems,
    refreshAccessToken: mockRefreshAccessToken,
  }),
}));

import { menuSync } from "@/lib/inngest/functions/menu-sync";

// The inngest.createFunction mock returns the handler directly
const handler = menuSync as unknown as (args: { event: { data: any } }) => Promise<any>;

describe("Menu Sync Inngest Function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips if integration is not active", async () => {
    prismaMock.pOSIntegration.findUnique.mockResolvedValue(
      createMockPOSIntegration({ isActive: false }) as any
    );

    const result = await handler({
      event: {
        data: {
          integrationId: "pos_1",
          restaurantId: "rest_1",
          provider: "SQUARE",
        },
      },
    });

    expect(result).toEqual({ action: "skipped", reason: "integration_not_active" });
  });

  it("skips manual integrations", async () => {
    prismaMock.pOSIntegration.findUnique.mockResolvedValue(
      createMockPOSIntegration({ provider: "MANUAL", isActive: true }) as any
    );
    prismaMock.pOSIntegration.update.mockResolvedValue({} as any);

    const result = await handler({
      event: {
        data: {
          integrationId: "pos_1",
          restaurantId: "rest_1",
          provider: "MANUAL",
        },
      },
    });

    expect(result).toEqual({ action: "skipped", reason: "manual_integration" });
  });

  it("syncs menu items from POS and creates new local items", async () => {
    prismaMock.pOSIntegration.findUnique.mockResolvedValue(
      createMockPOSIntegration({
        provider: "SQUARE",
        accessToken: "sq_access_123",
        isActive: true,
      }) as any
    );

    mockFetchMenuItems.mockResolvedValue([
      {
        posItemId: "SQ_ITEM_1",
        name: "Burger",
        description: "Classic burger",
        price: 12.99,
        category: "Mains",
        imageUrl: null,
      },
      {
        posItemId: "SQ_ITEM_2",
        name: "Salad",
        description: "Caesar salad",
        price: 9.99,
        category: "Starters",
        imageUrl: null,
      },
    ]);

    prismaMock.menuItem.findFirst.mockResolvedValue(null);
    prismaMock.menuItem.create.mockResolvedValue({} as any);
    prismaMock.pOSIntegration.update.mockResolvedValue({} as any);
    prismaMock.user.findFirst.mockResolvedValue(createMockUser() as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler({
      event: {
        data: {
          integrationId: "pos_1",
          restaurantId: "rest_1",
          provider: "SQUARE",
        },
      },
    });

    expect(result).toEqual({
      action: "synced",
      provider: "SQUARE",
      created: 2,
      updated: 0,
      total: 2,
    });

    expect(prismaMock.menuItem.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.menuItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Burger",
        posItemId: "SQ_ITEM_1",
        restaurantId: "rest_1",
      }),
    });
  });

  it("updates existing items matched by posItemId", async () => {
    prismaMock.pOSIntegration.findUnique.mockResolvedValue(
      createMockPOSIntegration({
        provider: "SQUARE",
        accessToken: "sq_access_123",
        isActive: true,
      }) as any
    );

    mockFetchMenuItems.mockResolvedValue([
      {
        posItemId: "SQ_ITEM_1",
        name: "Updated Burger",
        description: "Better burger",
        price: 14.99,
        category: "Mains",
        imageUrl: null,
      },
    ]);

    const existingItem = createMockMenuItem({
      id: "menu_1",
      posItemId: "SQ_ITEM_1",
      name: "Burger",
    });
    prismaMock.menuItem.findFirst.mockResolvedValue(existingItem as any);
    prismaMock.menuItem.update.mockResolvedValue({} as any);
    prismaMock.pOSIntegration.update.mockResolvedValue({} as any);
    prismaMock.user.findFirst.mockResolvedValue(createMockUser() as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler({
      event: {
        data: {
          integrationId: "pos_1",
          restaurantId: "rest_1",
          provider: "SQUARE",
        },
      },
    });

    expect(result).toEqual({
      action: "synced",
      provider: "SQUARE",
      created: 0,
      updated: 1,
      total: 1,
    });

    expect(prismaMock.menuItem.update).toHaveBeenCalledWith({
      where: { id: "menu_1" },
      data: expect.objectContaining({
        name: "Updated Burger",
        price: 14.99,
      }),
    });
  });

  it("refreshes token if expired before syncing", async () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);

    prismaMock.pOSIntegration.findUnique.mockResolvedValue(
      createMockPOSIntegration({
        provider: "SQUARE",
        accessToken: "old_token",
        refreshToken: "sq_refresh",
        tokenExpiresAt: expiredDate,
        isActive: true,
      }) as any
    );

    mockRefreshAccessToken.mockResolvedValue({
      accessToken: "new_token",
      refreshToken: "new_refresh",
      expiresAt: new Date("2026-04-01"),
    });

    mockFetchMenuItems.mockResolvedValue([]);
    prismaMock.pOSIntegration.update.mockResolvedValue({} as any);
    prismaMock.user.findFirst.mockResolvedValue(createMockUser() as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler({
      event: {
        data: {
          integrationId: "pos_1",
          restaurantId: "rest_1",
          provider: "SQUARE",
        },
      },
    });

    expect(mockRefreshAccessToken).toHaveBeenCalledWith("sq_refresh");
    expect(mockFetchMenuItems).toHaveBeenCalledWith("new_token", undefined);
  });

  it("records sync error on failure", async () => {
    prismaMock.pOSIntegration.findUnique.mockResolvedValue(
      createMockPOSIntegration({
        provider: "SQUARE",
        accessToken: "sq_access",
        isActive: true,
      }) as any
    );

    mockFetchMenuItems.mockRejectedValue(new Error("API connection timeout"));
    prismaMock.pOSIntegration.update.mockResolvedValue({} as any);
    prismaMock.user.findFirst.mockResolvedValue(createMockUser() as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await expect(
      handler({
        event: {
          data: {
            integrationId: "pos_1",
            restaurantId: "rest_1",
            provider: "SQUARE",
          },
        },
      })
    ).rejects.toThrow("API connection timeout");

    expect(prismaMock.pOSIntegration.update).toHaveBeenCalledWith({
      where: { id: "pos_1" },
      data: { lastSyncError: "API connection timeout" },
    });
  });
});
