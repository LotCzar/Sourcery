import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Supplier customer insights
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const supplierId = user.supplier.id;

    // Get all orders grouped by restaurant
    const orders = await prisma.order.findMany({
      where: {
        supplierId,
        status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] },
      },
      include: {
        restaurant: { select: { id: true, name: true, city: true, state: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate per restaurant
    const customerMap: Record<string, {
      restaurant: { id: string; name: string; city: string | null; state: string | null };
      orderCount: number;
      totalSpend: number;
      lastOrderDate: Date;
      topProducts: Record<string, number>;
    }> = {};

    for (const order of orders) {
      const rid = order.restaurantId;
      if (!customerMap[rid]) {
        customerMap[rid] = {
          restaurant: order.restaurant,
          orderCount: 0,
          totalSpend: 0,
          lastOrderDate: order.createdAt,
          topProducts: {},
        };
      }
      customerMap[rid].orderCount++;
      customerMap[rid].totalSpend += Number(order.total);
      if (order.createdAt > customerMap[rid].lastOrderDate) {
        customerMap[rid].lastOrderDate = order.createdAt;
      }
      for (const item of order.items) {
        const name = item.product.name;
        customerMap[rid].topProducts[name] = (customerMap[rid].topProducts[name] || 0) + Number(item.quantity);
      }
    }

    const customers = Object.values(customerMap)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .map((c) => ({
        ...c.restaurant,
        orderCount: c.orderCount,
        totalSpend: c.totalSpend,
        lastOrderDate: c.lastOrderDate,
        topProducts: Object.entries(c.topProducts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, qty]) => ({ name, quantity: qty })),
      }));

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    console.error("Supplier customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer insights", details: error?.message },
      { status: 500 }
    );
  }
}
