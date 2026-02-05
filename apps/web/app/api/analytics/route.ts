import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const restaurantId = user.restaurant.id;

    // Get all orders for this restaurant
    const orders = await prisma.order.findMany({
      where: { restaurantId },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate overview metrics
    const totalSpend = orders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );
    const totalOrders = orders.length;
    const totalItems = orders.reduce(
      (sum, order) => sum + order.items.length,
      0
    );

    // Get unique suppliers ordered from
    const uniqueSuppliers = new Set(orders.map((o) => o.supplier.id));

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

    // Spending by supplier
    const spendBySupplier: Record<string, { name: string; total: number; orders: number }> = {};
    orders.forEach((order) => {
      if (!spendBySupplier[order.supplier.id]) {
        spendBySupplier[order.supplier.id] = {
          name: order.supplier.name,
          total: 0,
          orders: 0,
        };
      }
      spendBySupplier[order.supplier.id].total += Number(order.total);
      spendBySupplier[order.supplier.id].orders += 1;
    });

    // Spending by category
    const spendByCategory: Record<string, number> = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.product.category;
        if (!spendByCategory[category]) {
          spendByCategory[category] = 0;
        }
        spendByCategory[category] += Number(item.subtotal);
      });
    });

    // Top products by spend
    const productSpend: Record<string, { name: string; total: number; quantity: number }> = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSpend[item.product.id]) {
          productSpend[item.product.id] = {
            name: item.product.name,
            total: 0,
            quantity: 0,
          };
        }
        productSpend[item.product.id].total += Number(item.subtotal);
        productSpend[item.product.id].quantity += Number(item.quantity);
      });
    });

    const topProducts = Object.values(productSpend)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Orders over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = orders.filter(
      (o) => new Date(o.createdAt) >= thirtyDaysAgo
    );

    // Group by day
    const ordersByDay: Record<string, { date: string; total: number; orders: number }> = {};

    // Initialize last 30 days with zeros
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      ordersByDay[dateStr] = { date: dateStr, total: 0, orders: 0 };
    }

    recentOrders.forEach((order) => {
      const dateStr = new Date(order.createdAt).toISOString().split("T")[0];
      if (ordersByDay[dateStr]) {
        ordersByDay[dateStr].total += Number(order.total);
        ordersByDay[dateStr].orders += 1;
      }
    });

    const spendOverTime = Object.values(ordersByDay).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Orders by status
    const ordersByStatus: Record<string, number> = {};
    orders.forEach((order) => {
      if (!ordersByStatus[order.status]) {
        ordersByStatus[order.status] = 0;
      }
      ordersByStatus[order.status] += 1;
    });

    // Recent orders (last 5)
    const recentOrdersList = orders.slice(0, 5).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      supplier: order.supplier.name,
      total: Number(order.total),
      status: order.status,
      date: order.createdAt,
      itemCount: order.items.length,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalSpend,
          totalOrders,
          totalItems,
          uniqueSuppliers: uniqueSuppliers.size,
          avgOrderValue,
        },
        spendBySupplier: Object.values(spendBySupplier).sort(
          (a, b) => b.total - a.total
        ),
        spendByCategory: Object.entries(spendByCategory)
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total),
        topProducts,
        spendOverTime,
        ordersByStatus: Object.entries(ordersByStatus).map(([status, count]) => ({
          status,
          count,
        })),
        recentOrders: recentOrdersList,
      },
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error?.message },
      { status: 500 }
    );
  }
}
