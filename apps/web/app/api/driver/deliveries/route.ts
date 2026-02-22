import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List deliveries assigned to the current driver
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== "DRIVER") {
      return NextResponse.json(
        { error: "Driver access required" },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        driverId: user.id,
        status: { in: ["CONFIRMED", "SHIPPED", "IN_TRANSIT"] },
      },
      orderBy: [
        { estimatedDeliveryAt: "asc" },
        { deliveryDate: "asc" },
      ],
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: Number(order.total),
        deliveryDate: order.deliveryDate,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        shippedAt: order.shippedAt,
        inTransitAt: order.inTransitAt,
        trackingNotes: order.trackingNotes,
        deliveryNotes: order.deliveryNotes,
        restaurant: order.restaurant,
        supplier: order.supplier,
        itemCount: order._count.items,
        createdAt: order.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get driver deliveries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliveries", details: error?.message },
      { status: 500 }
    );
  }
}
