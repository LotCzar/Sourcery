import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "ORG_ADMIN" || !user.organizationId) {
      return NextResponse.json(
        { error: "Requires ORG_ADMIN role with an organization" },
        { status: 403 }
      );
    }

    const restaurants = await prisma.restaurant.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
    });

    const restaurantIds = restaurants.map((r) => r.id);

    // Current month start
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Last month start/end
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);

    // This month orders
    const thisMonthOrders = await prisma.order.findMany({
      where: {
        restaurantId: { in: restaurantIds },
        status: { notIn: ["CANCELLED", "DRAFT"] },
        createdAt: { gte: monthStart },
      },
      select: { total: true, restaurantId: true },
    });

    // Last month orders (for comparison)
    const lastMonthOrders = await prisma.order.findMany({
      where: {
        restaurantId: { in: restaurantIds },
        status: { notIn: ["CANCELLED", "DRAFT"] },
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      select: { total: true },
    });

    const totalSpend = thisMonthOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );
    const lastMonthSpend = lastMonthOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );
    const spendChangePercent =
      lastMonthSpend > 0
        ? Math.round(
            ((totalSpend - lastMonthSpend) / lastMonthSpend) * 10000
          ) / 100
        : 0;

    // Low stock count
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        restaurantId: { in: restaurantIds },
        parLevel: { not: null },
      },
      select: { currentQuantity: true, parLevel: true },
    });

    const totalLowStockAlerts = lowStockItems.filter(
      (item) =>
        item.parLevel && Number(item.currentQuantity) <= Number(item.parLevel)
    ).length;

    // Top suppliers by spend
    const supplierOrders = await prisma.order.findMany({
      where: {
        restaurantId: { in: restaurantIds },
        status: { notIn: ["CANCELLED", "DRAFT"] },
        createdAt: { gte: monthStart },
      },
      include: { supplier: { select: { name: true } } },
    });

    const supplierSpendMap: Record<string, number> = {};
    for (const order of supplierOrders) {
      const name = order.supplier.name;
      supplierSpendMap[name] = (supplierSpendMap[name] || 0) + Number(order.total);
    }

    const topSuppliers = Object.entries(supplierSpendMap)
      .map(([name, spend]) => ({
        name,
        spend: Math.round(spend * 100) / 100,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // Per-restaurant breakdown
    const spendByRestaurant: Record<string, number> = {};
    for (const order of thisMonthOrders) {
      spendByRestaurant[order.restaurantId] =
        (spendByRestaurant[order.restaurantId] || 0) + Number(order.total);
    }

    const restaurantBreakdown = restaurants.map((r) => ({
      name: r.name,
      spend: Math.round((spendByRestaurant[r.id] || 0) * 100) / 100,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalSpend: Math.round(totalSpend * 100) / 100,
        lastMonthSpend: Math.round(lastMonthSpend * 100) / 100,
        spendChangePercent,
        totalOrders: thisMonthOrders.length,
        totalRestaurants: restaurants.length,
        totalLowStockAlerts,
        topSuppliers,
        restaurantBreakdown,
      },
    });
  } catch (error: any) {
    console.error("Org summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch org summary" },
      { status: 500 }
    );
  }
}
