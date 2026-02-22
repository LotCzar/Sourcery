import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List pending approvals for user's restaurant
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

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const pendingOrders = await prisma.order.findMany({
      where: {
        restaurantId: user.restaurant.id,
        status: "AWAITING_APPROVAL",
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approvals: {
          where: { status: "PENDING" },
          select: {
            id: true,
            createdAt: true,
            requestedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: pendingOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        supplier: order.supplier,
        createdBy: order.createdBy,
        approval: order.approvals[0] || null,
        createdAt: order.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get pending approvals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending approvals", details: error?.message },
      { status: 500 }
    );
  }
}
