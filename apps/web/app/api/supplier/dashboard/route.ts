import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's supplier
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const supplierId = user.supplier.id;

    // Get dashboard stats
    const [
      totalProducts,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      recentOrders,
      totalRevenue,
      overdueInvoiceCount,
      outOfStockCount,
    ] = await Promise.all([
      // Total products
      prisma.supplierProduct.count({
        where: { supplierId },
      }),

      // Pending orders count
      prisma.order.count({
        where: { supplierId, status: "PENDING" },
      }),

      // Confirmed orders count
      prisma.order.count({
        where: { supplierId, status: "CONFIRMED" },
      }),

      // Shipped orders count
      prisma.order.count({
        where: { supplierId, status: "SHIPPED" },
      }),

      // Delivered orders (this month)
      prisma.order.count({
        where: {
          supplierId,
          status: "DELIVERED",
          deliveredAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Recent orders
      prisma.order.findMany({
        where: { supplierId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Total revenue from delivered orders
      prisma.order.aggregate({
        where: {
          supplierId,
          status: "DELIVERED",
        },
        _sum: {
          total: true,
        },
      }),

      // Overdue invoices
      prisma.invoice.count({
        where: {
          supplierId,
          status: { in: ["PENDING", "OVERDUE"] },
          dueDate: { lt: new Date() },
        },
      }),

      // Out-of-stock products
      prisma.supplierProduct.count({
        where: { supplierId, inStock: false },
      }),
    ]);

    // Compute at-risk customer count (ordered 30-60 days ago but not in last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [recentCustomerIds, olderCustomerIds] = await Promise.all([
      prisma.order.findMany({
        where: { supplierId, createdAt: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } },
        select: { restaurantId: true },
        distinct: ["restaurantId"],
      }),
      prisma.order.findMany({
        where: { supplierId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: "CANCELLED" } },
        select: { restaurantId: true },
        distinct: ["restaurantId"],
      }),
    ]);

    const recentSet = new Set(recentCustomerIds.map((r) => r.restaurantId));
    const atRiskCustomerCount = olderCustomerIds.filter((r) => !recentSet.has(r.restaurantId)).length;

    // Build briefing summary
    const briefingParts: string[] = [];
    if (pendingOrders > 0) briefingParts.push(`${pendingOrders} order${pendingOrders !== 1 ? "s" : ""} awaiting confirmation.`);
    if (overdueInvoiceCount > 0) briefingParts.push(`${overdueInvoiceCount} overdue invoice${overdueInvoiceCount !== 1 ? "s" : ""} need attention.`);
    if (outOfStockCount > 0) briefingParts.push(`${outOfStockCount} product${outOfStockCount !== 1 ? "s" : ""} marked out of stock.`);
    if (atRiskCustomerCount > 0) briefingParts.push(`${atRiskCustomerCount} customer${atRiskCustomerCount !== 1 ? "s" : ""} at risk of churning.`);
    const briefingSummary = briefingParts.length > 0 ? briefingParts.join(" ") : null;

    // Get top products by order count
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { supplierId },
      },
      _count: {
        productId: true,
      },
      _sum: {
        subtotal: true,
      },
      orderBy: {
        _count: {
          productId: "desc",
        },
      },
      take: 5,
    });

    // Get product details for top products
    const topProductDetails = await prisma.supplierProduct.findMany({
      where: {
        id: { in: topProducts.map((p) => p.productId) },
      },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
      },
    });

    const topProductsWithDetails = topProducts.map((p) => {
      const product = topProductDetails.find((pd) => pd.id === p.productId);
      return {
        ...product,
        orderCount: p._count.productId,
        totalRevenue: p._sum.subtotal ? Number(p._sum.subtotal) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          pendingOrders,
          confirmedOrders,
          shippedOrders,
          deliveredOrdersThisMonth: deliveredOrders,
          totalRevenue: totalRevenue._sum.total
            ? Number(totalRevenue._sum.total)
            : 0,
        },
        recentOrders: recentOrders.map((order) => ({
          ...order,
          subtotal: Number(order.subtotal),
          tax: Number(order.tax),
          deliveryFee: Number(order.deliveryFee),
          total: Number(order.total),
        })),
        topProducts: topProductsWithDetails,
        briefing: {
          summary: briefingSummary,
          pendingOrderCount: pendingOrders,
          overdueInvoiceCount,
          outOfStockCount: outOfStockCount,
          atRiskCustomerCount,
        },
        supplier: {
          id: user.supplier.id,
          name: user.supplier.name,
          status: user.supplier.status,
        },
      },
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
