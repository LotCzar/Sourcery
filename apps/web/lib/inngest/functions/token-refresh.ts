import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAdapter } from "@/lib/pos";

export const tokenRefresh = inngest.createFunction(
  {
    id: "pos-token-refresh",
    name: "POS Token Refresh",
  },
  { cron: "0 3 * * *" }, // Daily at 3 AM
  async () => {
    // Find integrations with tokens expiring within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const integrations = await prisma.pOSIntegration.findMany({
      where: {
        isActive: true,
        tokenExpiresAt: {
          lte: sevenDaysFromNow,
        },
        refreshToken: {
          not: null,
        },
      },
    });

    const results: Array<{
      id: string;
      provider: string;
      status: "refreshed" | "failed";
      error?: string;
    }> = [];

    for (const integration of integrations) {
      const adapter = await getAdapter(integration.provider);
      if (!adapter?.refreshAccessToken || !integration.refreshToken) {
        results.push({
          id: integration.id,
          provider: integration.provider,
          status: "failed",
          error: "No refresh capability",
        });
        continue;
      }

      try {
        const tokens = await adapter.refreshAccessToken(integration.refreshToken);

        await prisma.pOSIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? integration.refreshToken,
            tokenExpiresAt: tokens.expiresAt ?? null,
            lastSyncError: null,
          },
        });

        results.push({
          id: integration.id,
          provider: integration.provider,
          status: "refreshed",
        });
      } catch (err: any) {
        const errorMsg = err.message || "Unknown refresh error";
        await prisma.pOSIntegration.update({
          where: { id: integration.id },
          data: { lastSyncError: `Token refresh failed: ${errorMsg}` },
        });

        results.push({
          id: integration.id,
          provider: integration.provider,
          status: "failed",
          error: errorMsg,
        });
      }
    }

    return {
      action: "token_refresh",
      total: integrations.length,
      refreshed: results.filter((r) => r.status === "refreshed").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };
  }
);
