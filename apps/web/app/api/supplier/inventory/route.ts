import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Inventory overview with filters
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
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const supplierId = user.supplier.id;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all products with stock info
    const products = await prisma.supplierProduct.findMany({
      where: { supplierId },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        price: true,
        unit: true,
        inStock: true,
        stockQuantity: true,
        reorderPoint: true,
        expirationDate: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Compute flags and filter
    const enriched = products.map((p) => ({
      ...p,
      price: Number(p.price),
      isLowStock:
        p.stockQuantity !== null &&
        p.reorderPoint !== null &&
        p.stockQuantity <= p.reorderPoint,
      isExpiringSoon:
        p.expirationDate !== null &&
        p.expirationDate >= now &&
        p.expirationDate <= sevenDaysFromNow,
      isOutOfStock: !p.inStock || p.stockQuantity === 0,
    }));

    let filtered = enriched;
    if (filter === "low-stock") {
      filtered = enriched.filter((p) => p.isLowStock);
    } else if (filter === "expiring-soon") {
      filtered = enriched.filter((p) => p.isExpiringSoon);
    } else if (filter === "out-of-stock") {
      filtered = enriched.filter((p) => p.isOutOfStock);
    }

    // Summary stats
    const totalProducts = products.length;
    const inStockCount = products.filter((p) => p.inStock).length;
    const lowStockCount = enriched.filter((p) => p.isLowStock).length;
    const outOfStockCount = enriched.filter((p) => p.isOutOfStock).length;
    const expiringSoonCount = enriched.filter((p) => p.isExpiringSoon).length;

    return NextResponse.json({
      success: true,
      data: {
        products: filtered,
        summary: {
          totalProducts,
          inStockCount,
          lowStockCount,
          outOfStockCount,
          expiringSoonCount,
        },
      },
    });
  } catch (error: any) {
    console.error("Get inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
