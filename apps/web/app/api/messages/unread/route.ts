import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Unread message count across all orders
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true, supplier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isSupplierUser = !!user.supplier;

    let unreadCount: number;

    if (isSupplierUser) {
      // Supplier: count messages on their orders sent by restaurant users, not read, not internal
      unreadCount = await prisma.orderMessage.count({
        where: {
          order: { supplierId: user.supplier!.id },
          senderId: { not: user.id },
          isInternal: false,
          readAt: null,
        },
      });
    } else if (user.restaurant) {
      // Restaurant: count messages on their orders sent by others, not read
      unreadCount = await prisma.orderMessage.count({
        where: {
          order: { restaurantId: user.restaurant.id },
          senderId: { not: user.id },
          readAt: null,
        },
      });
    } else {
      unreadCount = 0;
    }

    return NextResponse.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    console.error("Get unread count error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count", details: error?.message },
      { status: 500 }
    );
  }
}
