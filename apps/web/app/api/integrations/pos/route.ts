import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { ConnectIntegrationSchema } from "@/lib/validations";
import { isProviderConfigured, buildOAuthUrl } from "@/lib/pos";

// GET - Get current POS integration status
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: { include: { posIntegration: true } } },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const integration = user.restaurant.posIntegration;

    return NextResponse.json({
      success: true,
      data: integration
        ? {
            id: integration.id,
            provider: integration.provider,
            storeId: integration.storeId,
            lastSyncAt: integration.lastSyncAt,
            isActive: integration.isActive,
            createdAt: integration.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Get POS integration error:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Connect a POS integration
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateBody(ConnectIntegrationSchema, body);
    if (!validation.success) return validation.response;

    const { provider, storeId } = validation.data;

    // MANUAL provider: create integration directly
    if (provider === "MANUAL") {
      const integration = await prisma.pOSIntegration.upsert({
        where: { restaurantId: user.restaurant.id },
        update: { provider, storeId: storeId || null, isActive: true },
        create: {
          provider,
          storeId: storeId || null,
          restaurantId: user.restaurant.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: integration.id,
          provider: integration.provider,
          storeId: integration.storeId,
          lastSyncAt: integration.lastSyncAt,
          isActive: integration.isActive,
          createdAt: integration.createdAt,
        },
      });
    }

    // OAuth provider: check if configured
    if (!isProviderConfigured(provider)) {
      return NextResponse.json(
        {
          error: `${provider} integration is not configured. Contact your administrator.`,
        },
        { status: 503 }
      );
    }

    // Build OAuth URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/integrations/pos/callback`;
    const state = Buffer.from(
      JSON.stringify({ restaurantId: user.restaurant.id, provider })
    ).toString("base64");

    const authUrl = buildOAuthUrl(provider, redirectUri, state);

    return NextResponse.json({
      success: true,
      data: { authUrl },
    });
  } catch (error: any) {
    console.error("Connect POS integration error:", error);
    return NextResponse.json(
      { error: "Failed to connect integration", details: error?.message },
      { status: 500 }
    );
  }
}
