import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Supplier analytics
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
    const period = searchParams.get("period") || "30d";

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const supplierId = user.supplier.id;

    // Get orders in period
    const orders = await prisma.order.findMany({
      where: {
        supplierId,
        status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] },
        createdAt: { gte: startDate },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, category: true } },
          },
        },
        restaurant: { select: { id: true, name: true } },
      },
    });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Unique customers
    const customerIds = new Set(orders.map((o) => o.restaurantId));

    // Top products by revenue
    const productRevenue: Record<string, { name: string; revenue: number; units: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.productId;
        if (!productRevenue[key]) {
          productRevenue[key] = { name: item.product.name, revenue: 0, units: 0 };
        }
        productRevenue[key].revenue += Number(item.subtotal);
        productRevenue[key].units += Number(item.quantity);
      }
    }

    const topProducts = Object.entries(productRevenue)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        orderCount,
        avgOrderValue,
        customerCount: customerIds.size,
        topProducts,
        period,
      },
    });
  } catch (error: any) {
    console.error("Supplier analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error?.message },
      { status: 500 }
    );
  }
}
