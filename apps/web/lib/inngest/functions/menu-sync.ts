import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAdapter } from "@/lib/pos";
import type { POSProvider } from "@prisma/client";

export const menuSync = inngest.createFunction(
  { id: "menu-sync", name: "POS Menu Sync" },
  { event: "pos/sync.requested" },
  async ({ event }) => {
    const { integrationId, restaurantId, provider } = event.data;

    const integration = await prisma.pOSIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.isActive) {
      return { action: "skipped", reason: "integration_not_active" };
    }

    if (provider === "MANUAL") {
      await prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() },
      });
      return { action: "skipped", reason: "manual_integration" };
    }

    const adapter = await getAdapter(provider as POSProvider);
    if (!adapter) {
      await prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: { lastSyncError: `No adapter available for ${provider}` },
      });
      return { action: "failed", reason: "no_adapter" };
    }

    let accessToken = integration.accessToken;
    if (!accessToken) {
      await prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: { lastSyncError: "No access token available" },
      });
      return { action: "failed", reason: "no_access_token" };
    }

    // Safety net: refresh token if it's expired
    if (
      integration.tokenExpiresAt &&
      integration.tokenExpiresAt <= new Date() &&
      integration.refreshToken &&
      adapter.refreshAccessToken
    ) {
      try {
        const tokens = await adapter.refreshAccessToken(integration.refreshToken);
        accessToken = tokens.accessToken;
        await prisma.pOSIntegration.update({
          where: { id: integrationId },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? integration.refreshToken,
            tokenExpiresAt: tokens.expiresAt ?? null,
          },
        });
      } catch (err: any) {
        await prisma.pOSIntegration.update({
          where: { id: integrationId },
          data: { lastSyncError: `Token refresh failed: ${err.message}` },
        });
        return { action: "failed", reason: "token_refresh_failed" };
      }
    }

    try {
      const posItems = await adapter.fetchMenuItems(
        accessToken,
        integration.merchantId ?? undefined
      );

      let created = 0;
      let updated = 0;

      for (const posItem of posItems) {
        const existing = await prisma.menuItem.findFirst({
          where: { restaurantId, posItemId: posItem.posItemId },
        });

        if (existing) {
          await prisma.menuItem.update({
            where: { id: existing.id },
            data: {
              name: posItem.name,
              description: posItem.description ?? existing.description,
              price: posItem.price,
              category: posItem.category ?? existing.category,
              imageUrl: posItem.imageUrl ?? existing.imageUrl,
            },
          });
          updated++;
        } else {
          await prisma.menuItem.create({
            data: {
              name: posItem.name,
              description: posItem.description ?? null,
              price: posItem.price,
              category: posItem.category ?? null,
              imageUrl: posItem.imageUrl ?? null,
              posItemId: posItem.posItemId,
              restaurantId,
            },
          });
          created++;
        }
      }

      // Update sync timestamp and clear errors
      await prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      });

      const syncResult = `Synced ${posItems.length} items from ${provider} (${created} created, ${updated} updated)`;

      // Notify the restaurant owner
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId, role: "OWNER" },
      });

      if (ownerUser) {
        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "Menu Sync Complete",
            message: syncResult,
            userId: ownerUser.id,
          },
        });
      }

      return { action: "synced", provider, created, updated, total: posItems.length };
    } catch (err: any) {
      const errorMsg = err.message || "Unknown sync error";
      console.error("[menu-sync] failed:", { integrationId, restaurantId }, err);

      await prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: { lastSyncError: errorMsg },
      });

      // Notify owner of failure
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId, role: "OWNER" },
      });
      if (ownerUser) {
        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "Menu Sync Failed",
            message: `Failed to sync menu from ${provider}: ${errorMsg}`,
            userId: ownerUser.id,
          },
        });
      }

      throw err;
    }
  }
);
