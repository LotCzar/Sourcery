import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdapter } from "@/lib/pos";
import type { POSProvider } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&status=error&reason=oauth_failed`
    );
  }

  let restaurantId: string;
  let provider: POSProvider;

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString());
    restaurantId = decoded.restaurantId;
    provider = decoded.provider;
  } catch {
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&status=error&reason=invalid_state`
    );
  }

  const adapter = await getAdapter(provider);
  if (!adapter?.exchangeCodeForTokens) {
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&status=error&reason=unsupported_provider`
    );
  }

  try {
    const redirectUri = `${appUrl}/api/integrations/pos/callback`;
    const tokens = await adapter.exchangeCodeForTokens(code, redirectUri);

    await prisma.pOSIntegration.upsert({
      where: { restaurantId },
      update: {
        provider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenExpiresAt: tokens.expiresAt ?? null,
        merchantId: tokens.merchantId ?? null,
        isActive: true,
        lastSyncError: null,
      },
      create: {
        provider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenExpiresAt: tokens.expiresAt ?? null,
        merchantId: tokens.merchantId ?? null,
        restaurantId,
        isActive: true,
      },
    });

    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&status=success`
    );
  } catch (err) {
    console.error("[pos-callback] Token exchange failed:", err);
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&status=error&reason=token_exchange_failed`
    );
  }
}
