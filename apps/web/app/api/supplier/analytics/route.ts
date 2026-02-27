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

    // Previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const supplierId = user.supplier.id;

    // Get orders in current period
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
      take: 5000,
    });

    // Get orders in previous period for comparison
    const prevOrders = await prisma.order.findMany({
      where: {
        supplierId,
        status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] },
        createdAt: { gte: prevStartDate, lt: startDate },
      },
      include: {
        restaurant: { select: { id: true } },
      },
      take: 5000,
    });

    // Calculate current period metrics
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Unique customers
    const customerIds = new Set(orders.map((o) => o.restaurantId));

    // Calculate previous period metrics
    const prevRevenue = prevOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const prevOrderCount = prevOrders.length;
    const prevAvgOrderValue = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;
    const prevCustomerIds = new Set(prevOrders.map((o) => o.restaurantId));

    // Comparison deltas (percentage change)
    const pctDelta = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    const comparison = {
      revenueDelta: pctDelta(totalRevenue, prevRevenue),
      orderCountDelta: pctDelta(orderCount, prevOrderCount),
      avgOrderValueDelta: pctDelta(avgOrderValue, prevAvgOrderValue),
      customerCountDelta: pctDelta(customerIds.size, prevCustomerIds.size),
    };

    // Top products by revenue
    const productRevenue: Record<string, { name: string; revenue: number; units: number }> = {};
    const categoryRevenue: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const order of orders) {
      // Count by status
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;

      for (const item of order.items) {
        const key = item.productId;
        if (!productRevenue[key]) {
          productRevenue[key] = { name: item.product.name, revenue: 0, units: 0 };
        }
        productRevenue[key].revenue += Number(item.subtotal);
        productRevenue[key].units += Number(item.quantity);

        // Revenue by category
        const cat = item.product.category;
        categoryRevenue[cat] = (categoryRevenue[cat] || 0) + Number(item.subtotal);
      }
    }

    const topProducts = Object.entries(productRevenue)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));

    const revenueByCategory = Object.entries(categoryRevenue)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const ordersByStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }));

    // Revenue over time (group by day with zero-fill)
    const ordersByDay: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      ordersByDay[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
    }

    for (const order of orders) {
      const dateStr = new Date(order.createdAt).toISOString().split("T")[0];
      if (ordersByDay[dateStr]) {
        ordersByDay[dateStr].revenue += Number(order.total);
        ordersByDay[dateStr].orders += 1;
      }
    }

    const revenueOverTime = Object.values(ordersByDay).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        orderCount,
        avgOrderValue,
        customerCount: customerIds.size,
        topProducts,
        period,
        revenueOverTime,
        revenueByCategory,
        ordersByStatus,
        comparison,
      },
    });
  } catch (error: any) {
    console.error("Supplier analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
