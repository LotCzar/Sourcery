import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Disconnect POS integration
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

    if (!user.restaurant.posIntegration) {
      return NextResponse.json(
        { error: "No integration found" },
        { status: 404 }
      );
    }

    await prisma.pOSIntegration.delete({
      where: { id: user.restaurant.posIntegration.id },
    });

    return NextResponse.json({
      success: true,
      message: "Integration disconnected",
    });
  } catch (error: any) {
    console.error("Disconnect POS integration error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration", details: error?.message },
      { status: 500 }
    );
  }
}
