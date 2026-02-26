import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAdapter } from "@/lib/pos";
import type { POSProvider } from "@prisma/client";
import type { POSMenuItem } from "@/lib/pos/types";

export const posPushSync = inngest.createFunction(
  { id: "pos-push-sync", name: "POS Push Sync (FreshSheet → POS)" },
  { event: "pos/push.requested" },
  async ({ event }) => {
    const { integrationId, restaurantId, provider, menuItemIds } = event.data;

    const integration = await prisma.pOSIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.isActive || !integration.accessToken) {
      return { action: "skipped", reason: "integration_not_active_or_no_token" };
    }

    const adapter = await getAdapter(provider as POSProvider);
    if (!adapter?.pushMenuItems) {
      return { action: "skipped", reason: "adapter_does_not_support_push" };
    }

    // Refresh token if expired
    let accessToken = integration.accessToken;
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
          data: { lastSyncError: `Push token refresh failed: ${err.message}` },
        });
        return { action: "failed", reason: "token_refresh_failed" };
      }
    }

    // Fetch local menu items to push
    const where: any = { restaurantId };
    if (menuItemIds && menuItemIds.length > 0) {
      where.id = { in: menuItemIds };
    }

    const localItems = await prisma.menuItem.findMany({ where });

    const posItems: POSMenuItem[] = localItems.map((item) => ({
      posItemId: item.posItemId ?? "",
      name: item.name,
      description: item.description,
      price: Number(item.price),
      category: item.category,
      imageUrl: item.imageUrl,
    }));

    try {
      const result = await adapter.pushMenuItems(
        accessToken,
        posItems,
        integration.merchantId ?? undefined
      );

      // Update posItemId for newly created items in the POS
      for (const mapping of result.idMappings) {
        // Find the local item that matches the temp ID
        const matchingLocal = localItems.find(
          (item) => !item.posItemId && mapping.localId.includes(item.name.replace(/\s+/g, "-").toLowerCase())
        );
        if (matchingLocal) {
          await prisma.menuItem.update({
            where: { id: matchingLocal.id },
            data: { posItemId: mapping.posItemId },
          });
        }
      }

      return {
        action: "pushed",
        provider,
        pushed: result.pushed,
        errors: result.errors,
        newMappings: result.idMappings.length,
      };
    } catch (err: any) {
      console.error("[pos-push-sync] failed:", err);
      await prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: { lastSyncError: `Push failed: ${err.message}` },
      });
      throw err;
    }
  }
);
