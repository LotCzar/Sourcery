import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Supplier customer insights
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

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
      take: 5000,
    });

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate per restaurant
    const customerMap: Record<string, {
      restaurant: { id: string; name: string; city: string | null; state: string | null };
      orderCount: number;
      totalSpend: number;
      firstOrderDate: Date;
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
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt,
          topProducts: {},
        };
      }
      customerMap[rid].orderCount++;
      customerMap[rid].totalSpend += Number(order.total);
      if (order.createdAt > customerMap[rid].lastOrderDate) {
        customerMap[rid].lastOrderDate = order.createdAt;
      }
      if (order.createdAt < customerMap[rid].firstOrderDate) {
        customerMap[rid].firstOrderDate = order.createdAt;
      }
      for (const item of order.items) {
        const name = item.product.name;
        customerMap[rid].topProducts[name] = (customerMap[rid].topProducts[name] || 0) + Number(item.quantity);
      }
    }

    let customers = Object.values(customerMap)
      .map((c) => {
        const monthsSinceFirst = Math.max(
          1,
          (now.getTime() - c.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const avgOrderValue = c.orderCount > 0 ? c.totalSpend / c.orderCount : 0;
        const orderFrequency = c.orderCount / monthsSinceFirst;
        const atRisk = c.lastOrderDate < thirtyDaysAgo;

        return {
          ...c.restaurant,
          orderCount: c.orderCount,
          totalSpend: c.totalSpend,
          avgOrderValue,
          orderFrequency,
          firstOrderDate: c.firstOrderDate,
          lastOrderDate: c.lastOrderDate,
          atRisk,
          topProducts: Object.entries(c.topProducts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, qty]) => ({ name, quantity: qty })),
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.city && c.city.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    console.error("Supplier customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer insights" },
      { status: 500 }
    );
  }
}
