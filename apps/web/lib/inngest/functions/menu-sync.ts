import { inngest } from "../client";
import prisma from "@/lib/prisma";

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

    let syncResult: string;

    switch (provider) {
      case "SQUARE":
        // TODO: Implement Square catalog sync via /v2/catalog/list
        syncResult = "Square sync not yet implemented — requires developer account";
        break;
      case "TOAST":
        // TODO: Implement Toast menu sync via /menus/v2/menus
        syncResult = "Toast sync not yet implemented — requires developer account";
        break;
      case "CLOVER":
        // TODO: Implement Clover inventory sync via /v3/merchants/{mId}/items
        syncResult = "Clover sync not yet implemented — requires developer account";
        break;
      case "LIGHTSPEED":
        // TODO: Implement Lightspeed inventory sync via /API/V3/Account/{accountID}/Item
        syncResult = "Lightspeed sync not yet implemented — requires developer account";
        break;
      case "MANUAL":
        syncResult = "Manual integration — no sync required";
        break;
      default:
        syncResult = `Unknown provider: ${provider}`;
    }

    // Update last sync timestamp
    await prisma.pOSIntegration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

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

    return { action: "synced", provider, message: syncResult };
  }
);
