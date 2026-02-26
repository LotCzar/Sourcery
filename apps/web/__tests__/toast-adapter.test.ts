import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pos/config", () => ({
  getPOSProviderConfig: vi.fn().mockReturnValue({
    clientId: "toast_client_id",
    clientSecret: "toast_client_secret",
    authUrl: "https://ws-api.toasttab.com/usermgmt/v1/oauth/authorize",
    tokenUrl: "https://ws-api.toasttab.com/usermgmt/v1/oauth/token",
    scopes: ["menus.read"],
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ToastAdapter } from "@/lib/pos/toast-adapter";

describe("ToastAdapter", () => {
  let adapter: ToastAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOAST_API_HOSTNAME = "https://ws-api.toasttab.com";
    adapter = new ToastAdapter();
  });

  describe("authenticateClientCredentials", () => {
    it("authenticates with client credentials", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            token: {
              accessToken: "toast_token_123",
              expiresIn: 3600,
            },
          }),
      });

      const result = await adapter.authenticateClientCredentials("store_abc");

      expect(result.accessToken).toBe("toast_token_123");
      expect(result.merchantId).toBe("store_abc");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://ws-api.toasttab.com/authentication/v1/authentication/login",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("throws on authentication failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Invalid credentials"),
      });

      await expect(
        adapter.authenticateClientCredentials("bad_store")
      ).rejects.toThrow("Toast authentication failed (401)");
    });
  });

  describe("fetchMenuItems", () => {
    it("fetches and maps menu items from Toast", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              groups: [
                {
                  name: "Appetizers",
                  items: [
                    {
                      guid: "toast_item_1",
                      name: "Spring Rolls",
                      description: "Crispy vegetable spring rolls",
                      pricing: { basePrice: 8.99 },
                      imageUrl: "https://example.com/spring-rolls.jpg",
                    },
                    {
                      guid: "toast_item_2",
                      name: "Soup",
                      description: null,
                      pricing: { basePrice: 6.5 },
                    },
                  ],
                },
              ],
            },
          ]),
      });

      const items = await adapter.fetchMenuItems("toast_token_123", "store_abc");

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        posItemId: "toast_item_1",
        name: "Spring Rolls",
        description: "Crispy vegetable spring rolls",
        price: 8.99,
        category: "Appetizers",
        imageUrl: "https://example.com/spring-rolls.jpg",
      });
      expect(items[1]).toEqual({
        posItemId: "toast_item_2",
        name: "Soup",
        description: null,
        price: 6.5,
        category: "Appetizers",
        imageUrl: null,
      });
    });

    it("throws without merchantId", async () => {
      await expect(
        adapter.fetchMenuItems("toast_token_123")
      ).rejects.toThrow("Toast requires a merchantId");
    });

    it("throws on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal server error"),
      });

      await expect(
        adapter.fetchMenuItems("toast_token_123", "store_abc")
      ).rejects.toThrow("Toast menu fetch failed (500)");
    });
  });

  describe("fetchInventoryCounts", () => {
    it("fetches inventory counts", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { guid: "item_1", quantity: 50 },
            { guid: "item_2", quantity: 25 },
          ]),
      });

      const counts = await adapter.fetchInventoryCounts("toast_token_123", "store_abc");

      expect(counts).toHaveLength(2);
      expect(counts[0]).toEqual({
        posItemId: "item_1",
        quantity: 50,
      });
    });

    it("returns empty array on 403 (not available)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      const counts = await adapter.fetchInventoryCounts("toast_token_123", "store_abc");
      expect(counts).toHaveLength(0);
    });

    it("throws without merchantId", async () => {
      await expect(
        adapter.fetchInventoryCounts("toast_token_123")
      ).rejects.toThrow("Toast requires a merchantId");
    });
  });
});
