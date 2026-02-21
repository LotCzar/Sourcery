import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

// POST - Trigger menu sync
export async function POST() {
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

    if (!integration || !integration.isActive) {
      return NextResponse.json(
        { error: "No active integration found" },
        { status: 404 }
      );
    }

    await inngest.send({
      name: "pos/sync.requested",
      data: {
        integrationId: integration.id,
        restaurantId: user.restaurant.id,
        provider: integration.provider,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Menu sync initiated",
    });
  } catch (error: any) {
    console.error("Trigger POS sync error:", error);
    return NextResponse.json(
      { error: "Failed to trigger sync", details: error?.message },
      { status: 500 }
    );
  }
}
