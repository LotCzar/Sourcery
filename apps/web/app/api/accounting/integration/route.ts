import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get current accounting integration status
export async function GET() {
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
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const integration = await prisma.accountingIntegration.findUnique({
      where: { restaurantId: user.restaurant.id },
      select: {
        id: true,
        provider: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: integration || null,
    });
  } catch (error: any) {
    console.error("Get accounting integration error:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration" },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect accounting integration
export async function DELETE() {
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
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const integration = await prisma.accountingIntegration.findUnique({
      where: { restaurantId: user.restaurant.id },
    });

    if (!integration) {
      return NextResponse.json({ error: "No accounting integration found" }, { status: 404 });
    }

    await prisma.accountingIntegration.update({
      where: { id: integration.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Accounting integration disconnected",
    });
  } catch (error: any) {
    console.error("Disconnect accounting integration error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
