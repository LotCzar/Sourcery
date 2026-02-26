import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockObtainToken,
  mockCatalogList,
  mockCatalogBatchUpsert,
  mockInventoryBatchGetCounts,
  mockLocationsList,
  mockInventoryBatchCreateChanges,
} = vi.hoisted(() => ({
  mockObtainToken: vi.fn(),
  mockCatalogList: vi.fn(),
  mockCatalogBatchUpsert: vi.fn(),
  mockInventoryBatchGetCounts: vi.fn(),
  mockLocationsList: vi.fn(),
  mockInventoryBatchCreateChanges: vi.fn(),
}));

vi.mock("square", () => {
  class MockSquareClient {
    oAuth = { obtainToken: mockObtainToken };
    catalog = {
      list: mockCatalogList,
      batchUpsert: mockCatalogBatchUpsert,
    };
    inventory = {
      batchGetCounts: mockInventoryBatchGetCounts,
      batchCreateChanges: mockInventoryBatchCreateChanges,
    };
    locations = { list: mockLocationsList };
    constructor(_opts?: any) {}
  }
  return {
    SquareClient: MockSquareClient,
    SquareEnvironment: { Production: "https://connect.squareup.com", Sandbox: "https://connect.squareupsandbox.com" },
  };
});

vi.mock("@/lib/pos/config", () => ({
  getPOSProviderConfig: vi.fn().mockReturnValue({
    clientId: "sq0idp-test",
    clientSecret: "sq0csp-test",
    authUrl: "https://connect.squareup.com/oauth2/authorize",
    tokenUrl: "https://connect.squareup.com/oauth2/token",
    scopes: ["ITEMS_READ"],
  }),
}));

import { SquareAdapter } from "@/lib/pos/square-adapter";

describe("SquareAdapter", () => {
  let adapter: SquareAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SquareAdapter();
  });

  describe("exchangeCodeForTokens", () => {
    it("exchanges auth code for tokens", async () => {
      mockObtainToken.mockResolvedValue({
        accessToken: "sq_access_123",
        refreshToken: "sq_refresh_456",
        expiresAt: "2026-03-27T00:00:00Z",
        merchantId: "merchant_789",
      });

      const result = await adapter.exchangeCodeForTokens("auth_code_123", "http://localhost:3000/api/integrations/pos/callback");

      expect(result.accessToken).toBe("sq_access_123");
      expect(result.refreshToken).toBe("sq_refresh_456");
      expect(result.merchantId).toBe("merchant_789");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("throws when no access token returned", async () => {
      mockObtainToken.mockResolvedValue({
        accessToken: null,
      });

      await expect(
        adapter.exchangeCodeForTokens("bad_code", "http://localhost:3000/callback")
      ).rejects.toThrow("no access token returned");
    });
  });

  describe("refreshAccessToken", () => {
    it("refreshes an expired token", async () => {
      mockObtainToken.mockResolvedValue({
        accessToken: "sq_new_access",
        refreshToken: "sq_new_refresh",
        expiresAt: "2026-04-27T00:00:00Z",
        merchantId: "merchant_789",
      });

      const result = await adapter.refreshAccessToken("sq_refresh_456");

      expect(result.accessToken).toBe("sq_new_access");
      expect(result.refreshToken).toBe("sq_new_refresh");
    });
  });

  describe("fetchMenuItems", () => {
    it("fetches and maps catalog items", async () => {
      mockCatalogList.mockResolvedValue({
        data: [
          {
            id: "ITEM_1",
            type: "ITEM",
            itemData: {
              name: "Burger",
              description: "Classic beef burger",
              categoryId: "cat_1",
              imageIds: ["img_1"],
              variations: [
                {
                  itemVariationData: {
                    priceMoney: { amount: 1299, currency: "USD" },
                  },
                },
              ],
            },
          },
          {
            id: "ITEM_2",
            type: "ITEM",
            itemData: {
              name: "Fries",
              description: null,
              variations: [
                {
                  itemVariationData: {
                    priceMoney: { amount: 499, currency: "USD" },
                  },
                },
              ],
            },
          },
        ],
        cursor: undefined,
      });

      const items = await adapter.fetchMenuItems("sq_access_123");

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        posItemId: "ITEM_1",
        name: "Burger",
        description: "Classic beef burger",
        price: 12.99,
        category: "cat_1",
        imageUrl: "img_1",
      });
      expect(items[1]).toEqual({
        posItemId: "ITEM_2",
        name: "Fries",
        description: null,
        price: 4.99,
        category: null,
        imageUrl: null,
      });
    });

    it("handles pagination", async () => {
      mockCatalogList
        .mockResolvedValueOnce({
          data: [
            {
              id: "ITEM_1",
              type: "ITEM",
              itemData: {
                name: "Item 1",
                variations: [
                  { itemVariationData: { priceMoney: { amount: 100, currency: "USD" } } },
                ],
              },
            },
          ],
          cursor: "page_2",
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: "ITEM_2",
              type: "ITEM",
              itemData: {
                name: "Item 2",
                variations: [
                  { itemVariationData: { priceMoney: { amount: 200, currency: "USD" } } },
                ],
              },
            },
          ],
          cursor: undefined,
        });

      const items = await adapter.fetchMenuItems("sq_access_123");

      expect(items).toHaveLength(2);
      expect(mockCatalogList).toHaveBeenCalledTimes(2);
    });

    it("returns empty array for no items", async () => {
      mockCatalogList.mockResolvedValue({
        data: [],
        cursor: undefined,
      });

      const items = await adapter.fetchMenuItems("sq_access_123");
      expect(items).toHaveLength(0);
    });
  });

  describe("pushMenuItems", () => {
    it("pushes items to Square catalog", async () => {
      mockCatalogBatchUpsert.mockResolvedValue({
        idMappings: [
          { clientObjectId: "#freshsheet-burger-123", objectId: "SQ_ITEM_1" },
        ],
      });

      const result = await adapter.pushMenuItems("sq_access_123", [
        {
          posItemId: "",
          name: "Burger",
          price: 12.99,
          description: "Classic burger",
        },
      ]);

      expect(result.pushed).toBe(1);
      expect(result.idMappings).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("handles batch errors gracefully", async () => {
      mockCatalogBatchUpsert.mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      const result = await adapter.pushMenuItems("sq_access_123", [
        { posItemId: "", name: "Item", price: 10 },
      ]);

      expect(result.pushed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("API rate limit exceeded");
    });
  });
});
