import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
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

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch all data in parallel
    const [
      allOrders,
      thisMonthOrders,
      lastMonthOrders,
      recentOrders,
      pendingOrders,
      suppliers,
      priceComparisons,
      overdueInvoiceCount,
      allInventoryItems,
      criticalInsights,
    ] = await Promise.all([
      // All orders for the restaurant
      prisma.order.findMany({
        where: { restaurantId },
        select: {
          id: true,
          total: true,
          status: true,
          supplierId: true,
        },
      }),

      // This month's orders
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: startOfMonth },
          status: { not: "CANCELLED" },
        },
        select: { total: true },
      }),

      // Last month's orders
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { not: "CANCELLED" },
        },
        select: { total: true },
      }),

      // Recent orders (last 5)
      prisma.order.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          _count: { select: { items: true } },
        },
      }),

      // Pending orders count
      prisma.order.count({
        where: {
          restaurantId,
          status: { in: ["DRAFT", "PENDING", "CONFIRMED", "SHIPPED"] },
        },
      }),

      // Top suppliers by order count
      prisma.order.groupBy({
        by: ["supplierId"],
        where: {
          restaurantId,
          status: { not: "CANCELLED" },
        },
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Products available from multiple suppliers (price comparison opportunities)
      prisma.supplierProduct.groupBy({
        by: ["name"],
        _count: { name: true },
        _min: { price: true },
        _max: { price: true },
        having: {
          name: { _count: { gt: 1 } },
        },
        orderBy: { _count: { name: "desc" } },
        take: 5,
      }),

      // Overdue invoices
      prisma.invoice.count({
        where: {
          restaurantId,
          status: "PENDING",
          dueDate: { lt: new Date() },
        },
      }),

      // All inventory items (for low stock check — compare columns in JS)
      prisma.inventoryItem.findMany({
        where: { restaurantId },
        select: { id: true, name: true, currentQuantity: true, parLevel: true },
      }),

      // Critical consumption insights (< 3 days until stockout)
      prisma.consumptionInsight.findMany({
        where: {
          restaurantId,
          daysUntilStockout: { lt: 3 },
        },
        include: {
          inventoryItem: { select: { name: true } },
        },
      }),
    ]);

    // Calculate stats
    const thisMonthSpend = thisMonthOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );
    const lastMonthSpend = lastMonthOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );
    const spendChange = lastMonthSpend > 0
      ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100
      : 0;

    // Get supplier details for top suppliers
    const supplierIds = suppliers.map((s) => s.supplierId);
    const supplierDetails = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true },
    });
    const supplierMap = new Map(supplierDetails.map((s) => [s.id, s.name]));

    // Count orders by status
    const ordersByStatus = allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Format recent orders
    const formattedRecentOrders = recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      supplier: order.supplier.name,
      supplierId: order.supplier.id,
      itemCount: order._count.items,
      createdAt: order.createdAt,
    }));

    // Format top suppliers
    const topSuppliers = suppliers.map((s) => ({
      id: s.supplierId,
      name: supplierMap.get(s.supplierId) || "Unknown",
      orderCount: s._count.id,
      totalSpend: Number(s._sum.total) || 0,
    }));

    // Format price comparisons (savings opportunities)
    const savingsOpportunities = priceComparisons.map((p) => ({
      productName: p.name,
      supplierCount: p._count.name,
      lowestPrice: Number(p._min.price),
      highestPrice: Number(p._max.price),
      potentialSavings: Number(p._max.price) - Number(p._min.price),
    }));

    // Build AI briefing
    const lowStockItems = allInventoryItems.filter(
      (item) =>
        item.parLevel && Number(item.currentQuantity) <= Number(item.parLevel)
    );
    const criticalItemNames = criticalInsights.map(
      (ci) => ci.inventoryItem.name
    );

    const briefingParts: string[] = [];
    if (lowStockItems.length > 0) {
      briefingParts.push(`${lowStockItems.length} item${lowStockItems.length !== 1 ? "s" : ""} below par level`);
    }
    if (overdueInvoiceCount > 0) {
      briefingParts.push(`${overdueInvoiceCount} overdue invoice${overdueInvoiceCount !== 1 ? "s" : ""}`);
    }
    if (spendChange !== 0 && lastMonthSpend > 0) {
      briefingParts.push(
        `Spending is ${spendChange > 0 ? "up" : "down"} ${Math.abs(spendChange).toFixed(1)}% vs last month`
      );
    }
    if (criticalItemNames.length > 0) {
      briefingParts.push(
        `${criticalItemNames.join(", ")} running out within 3 days`
      );
    }

    const briefing = {
      summary: briefingParts.length > 0
        ? briefingParts.join(". ") + "."
        : null,
      lowStockCount: lowStockItems.length,
      overdueInvoiceCount,
      criticalItems: criticalItemNames,
    };

    return NextResponse.json({
      success: true,
      data: {
        briefing,
        stats: {
          thisMonthSpend,
          lastMonthSpend,
          spendChange,
          totalOrders: allOrders.length,
          pendingOrders,
          activeSuppliers: new Set(allOrders.map((o) => o.supplierId)).size,
        },
        ordersByStatus,
        recentOrders: formattedRecentOrders,
        topSuppliers,
        savingsOpportunities,
        restaurant: {
          name: user.restaurant.name,
          cuisineType: user.restaurant.cuisineType,
        },
      },
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data", details: error?.message },
      { status: 500 }
    );
  }
}
