import { SquareClient, SquareEnvironment } from "square";
import type { POSAdapter, POSMenuItem, POSInventoryCount, TokenResult, PushResult } from "./types";
import { getPOSProviderConfig } from "./config";

function getSquareClient(accessToken?: string): SquareClient {
  return new SquareClient({
    token: accessToken ?? "",
    environment:
      process.env.NODE_ENV === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

function getConfig() {
  const config = getPOSProviderConfig("SQUARE");
  if (!config) throw new Error("Square is not configured. Set SQUARE_CLIENT_ID and SQUARE_CLIENT_SECRET.");
  return config;
}

export class SquareAdapter implements POSAdapter {
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<TokenResult> {
    const config = getConfig();
    const client = getSquareClient();

    const result = await client.oAuth.obtainToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code,
      grantType: "authorization_code",
      redirectUri,
    });

    if (!result.accessToken) {
      throw new Error("Square OAuth token exchange failed: no access token returned");
    }

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? undefined,
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : undefined,
      merchantId: result.merchantId ?? undefined,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResult> {
    const config = getConfig();
    const client = getSquareClient();

    const result = await client.oAuth.obtainToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken,
      grantType: "refresh_token",
    });

    if (!result.accessToken) {
      throw new Error("Square token refresh failed: no access token returned");
    }

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? undefined,
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : undefined,
      merchantId: result.merchantId ?? undefined,
    };
  }

  async fetchMenuItems(accessToken: string): Promise<POSMenuItem[]> {
    const client = getSquareClient(accessToken);
    const items: POSMenuItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await client.catalog.list({
        cursor,
        types: "ITEM",
      });

      const objects = response.data ?? [];
      for (const obj of objects) {
        if (obj.type !== "ITEM" || !obj.itemData) continue;

        const variation = obj.itemData.variations?.[0];
        const priceMoney = variation?.itemVariationData?.priceMoney;
        const priceAmount = priceMoney?.amount ? Number(priceMoney.amount) / 100 : 0;

        items.push({
          posItemId: obj.id!,
          name: obj.itemData.name ?? "Untitled",
          description: obj.itemData.description ?? null,
          price: priceAmount,
          category: obj.itemData.categoryId ?? null,
          imageUrl: obj.itemData.imageIds?.[0] ?? null,
        });
      }

      cursor = response.cursor ?? undefined;
    } while (cursor);

    return items;
  }

  async pushMenuItems(
    accessToken: string,
    items: POSMenuItem[]
  ): Promise<PushResult> {
    const client = getSquareClient(accessToken);
    const errors: string[] = [];
    const idMappings: Array<{ localId: string; posItemId: string }> = [];
    let pushed = 0;

    // Process in batches of 1000 (Square limit)
    const batchSize = 1000;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const idempotencyKey = `freshsheet-push-${Date.now()}-${i}`;

      const objects = batch.map((item) => ({
        type: "ITEM" as const,
        id: item.posItemId || `#freshsheet-${item.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`,
        itemData: {
          name: item.name,
          description: item.description ?? undefined,
          variations: [
            {
              type: "ITEM_VARIATION" as const,
              id: `#variation-${item.posItemId || item.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`,
              itemVariationData: {
                name: "Regular",
                pricingType: "FIXED_PRICING" as const,
                priceMoney: {
                  amount: BigInt(Math.round(item.price * 100)),
                  currency: "USD",
                },
              },
            },
          ],
        },
      }));

      try {
        const response = await client.catalog.batchUpsert({
          idempotencyKey,
          batches: [{ objects }],
        });

        const mappings = response.idMappings ?? [];
        for (const mapping of mappings) {
          if (mapping.clientObjectId && mapping.objectId) {
            idMappings.push({
              localId: mapping.clientObjectId,
              posItemId: mapping.objectId,
            });
          }
        }
        pushed += batch.length;
      } catch (err: any) {
        errors.push(`Batch ${i / batchSize}: ${err.message}`);
      }
    }

    return { pushed, errors, idMappings };
  }

  async fetchInventoryCounts(
    accessToken: string
  ): Promise<POSInventoryCount[]> {
    const client = getSquareClient(accessToken);
    const counts: POSInventoryCount[] = [];
    let cursor: string | undefined;

    // First get all item IDs from catalog
    const catalogItems = await this.fetchMenuItems(accessToken);
    if (catalogItems.length === 0) return counts;

    do {
      const response = await client.inventory.batchGetCounts({
        catalogObjectIds: catalogItems.map((item) => item.posItemId),
        cursor,
      });

      const inventoryCounts = response.counts ?? [];
      for (const count of inventoryCounts) {
        if (count.catalogObjectId && count.quantity) {
          counts.push({
            posItemId: count.catalogObjectId,
            quantity: parseFloat(count.quantity),
            locationId: count.locationId ?? undefined,
          });
        }
      }

      cursor = response.cursor ?? undefined;
    } while (cursor);

    return counts;
  }

  async pushInventoryCounts(
    accessToken: string,
    inventoryCounts: POSInventoryCount[]
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const client = getSquareClient(accessToken);
    const errors: string[] = [];
    let updated = 0;

    // Get location ID
    const locationsResponse = await client.locations.list();
    const locationId = locationsResponse.data?.[0]?.id;
    if (!locationId) {
      return { created: 0, updated: 0, errors: ["No Square location found"] };
    }

    for (const count of inventoryCounts) {
      try {
        await client.inventory.batchCreateChanges({
          idempotencyKey: `freshsheet-inv-${count.posItemId}-${Date.now()}`,
          changes: [
            {
              type: "PHYSICAL_COUNT",
              physicalCount: {
                catalogObjectId: count.posItemId,
                locationId: count.locationId ?? locationId,
                quantity: count.quantity.toString(),
                state: "IN_STOCK",
                occurredAt: new Date().toISOString(),
              },
            },
          ],
        });
        updated++;
      } catch (err: any) {
        errors.push(`${count.posItemId}: ${err.message}`);
      }
    }

    return { created: 0, updated, errors };
  }
}
