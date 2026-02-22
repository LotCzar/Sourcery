import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Driver stats for today
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [assignedToday, completedToday, activeDelivery] = await Promise.all([
      prisma.order.count({
        where: {
          driverId: user.id,
          status: { in: ["CONFIRMED", "SHIPPED", "IN_TRANSIT", "DELIVERED"] },
          updatedAt: { gte: todayStart },
        },
      }),
      prisma.order.count({
        where: {
          driverId: user.id,
          status: "DELIVERED",
          deliveredAt: { gte: todayStart },
        },
      }),
      prisma.order.findFirst({
        where: {
          driverId: user.id,
          status: "IN_TRANSIT",
        },
        select: {
          id: true,
          orderNumber: true,
          restaurant: {
            select: { name: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        assignedToday,
        completedToday,
        activeDelivery: activeDelivery
          ? {
              id: activeDelivery.id,
              orderNumber: activeDelivery.orderNumber,
              restaurantName: activeDelivery.restaurant.name,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Get driver stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver stats", details: error?.message },
      { status: 500 }
    );
  }
}
