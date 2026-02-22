import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// GET - Handle OAuth callback from QuickBooks/Xero
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=unauthorized", request.url));
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=no_restaurant", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const realmId = searchParams.get("realmId"); // QuickBooks

    const cookieStore = await cookies();
    const savedState = cookieStore.get("accounting_oauth_state")?.value;
    const provider = cookieStore.get("accounting_provider")?.value as "QUICKBOOKS" | "XERO" | undefined;

    // Verify CSRF state
    if (!state || !savedState || state !== savedState) {
      return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=invalid_state", request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=no_code", request.url));
    }

    if (!provider) {
      return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=no_provider", request.url));
    }

    // Exchange code for tokens
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounting/callback`;

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let tenantId: string | null = null;

    if (provider === "QUICKBOOKS") {
      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=config_missing", request.url));
      }

      const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("QuickBooks token exchange failed:", await tokenResponse.text());
        return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=token_exchange_failed", request.url));
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
    } else {
      // Xero
      const clientId = process.env.XERO_CLIENT_ID;
      const clientSecret = process.env.XERO_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=config_missing", request.url));
      }

      const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Xero token exchange failed:", await tokenResponse.text());
        return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=token_exchange_failed", request.url));
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;

      // Get Xero tenant ID
      const connectionsResponse = await fetch("https://api.xero.com/connections", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (connectionsResponse.ok) {
        const connections = await connectionsResponse.json();
        if (connections.length > 0) {
          tenantId = connections[0].tenantId;
        }
      }
    }

    // Create or update integration record
    await prisma.accountingIntegration.upsert({
      where: { restaurantId: user.restaurant.id },
      create: {
        provider,
        accessToken,
        refreshToken,
        realmId: realmId || null,
        tenantId,
        restaurantId: user.restaurant.id,
        isActive: true,
      },
      update: {
        provider,
        accessToken,
        refreshToken,
        realmId: realmId || null,
        tenantId,
        isActive: true,
      },
    });

    // Clear OAuth cookies
    cookieStore.delete("accounting_oauth_state");
    cookieStore.delete("accounting_provider");

    return NextResponse.redirect(new URL("/settings?tab=integrations&status=connected", request.url));
  } catch (error: any) {
    console.error("Accounting callback error:", error);
    return NextResponse.redirect(new URL("/settings?tab=integrations&status=error&reason=server_error", request.url));
  }
}
