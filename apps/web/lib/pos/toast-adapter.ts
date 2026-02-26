import type { POSAdapter, POSMenuItem, POSInventoryCount, TokenResult } from "./types";
import { getPOSProviderConfig } from "./config";

function getToastApiHost(): string {
  return process.env.TOAST_API_HOSTNAME || "https://ws-api.toasttab.com";
}

function getConfig() {
  const config = getPOSProviderConfig("TOAST");
  if (!config) throw new Error("Toast is not configured. Set TOAST_CLIENT_ID and TOAST_CLIENT_SECRET.");
  return config;
}

// Toast rate limit: 1 request per second
async function rateLimitDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1100));
}

export class ToastAdapter implements POSAdapter {
  async authenticateClientCredentials(storeId: string): Promise<TokenResult> {
    const config = getConfig();
    const host = getToastApiHost();

    const response = await fetch(
      `${host}/authentication/v1/authentication/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          userAccessType: "TOAST_MACHINE_CLIENT",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Toast authentication failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.token?.accessToken ?? data.accessToken,
      expiresAt: data.token?.expiresIn
        ? new Date(Date.now() + data.token.expiresIn * 1000)
        : undefined,
      merchantId: storeId,
    };
  }

  async fetchMenuItems(
    accessToken: string,
    merchantId?: string
  ): Promise<POSMenuItem[]> {
    if (!merchantId) {
      throw new Error("Toast requires a merchantId (Restaurant External ID)");
    }

    const host = getToastApiHost();
    const items: POSMenuItem[] = [];

    const response = await fetch(`${host}/menus/v2/menus`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Toast-Restaurant-External-ID": merchantId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Toast menu fetch failed (${response.status}): ${errorText}`);
    }

    const menus = await response.json();

    for (const menu of menus) {
      for (const group of menu.groups ?? []) {
        await rateLimitDelay();

        for (const menuItem of group.items ?? []) {
          const price = menuItem.pricing?.basePrice
            ? Number(menuItem.pricing.basePrice)
            : 0;

          items.push({
            posItemId: menuItem.guid,
            name: menuItem.name ?? "Untitled",
            description: menuItem.description ?? null,
            price,
            category: group.name ?? null,
            imageUrl: menuItem.imageUrl ?? null,
          });
        }
      }
    }

    return items;
  }

  async fetchInventoryCounts(
    accessToken: string,
    merchantId?: string
  ): Promise<POSInventoryCount[]> {
    if (!merchantId) {
      throw new Error("Toast requires a merchantId (Restaurant External ID)");
    }

    const host = getToastApiHost();
    const counts: POSInventoryCount[] = [];

    const response = await fetch(`${host}/stock/v1/inventory`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Toast-Restaurant-External-ID": merchantId,
      },
    });

    if (!response.ok) {
      // Inventory endpoint may not be available on all Toast plans
      if (response.status === 403 || response.status === 404) {
        return counts;
      }
      const errorText = await response.text();
      throw new Error(`Toast inventory fetch failed (${response.status}): ${errorText}`);
    }

    const inventory = await response.json();

    for (const item of inventory ?? []) {
      if (item.guid && item.quantity != null) {
        counts.push({
          posItemId: item.guid,
          quantity: Number(item.quantity),
        });
      }
    }

    return counts;
  }

  // Toast standard access is read-only — no pushMenuItems or pushInventoryCounts
}
