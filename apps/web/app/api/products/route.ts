import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const supplierId = searchParams.get("supplier") || "";
    const sortBy = searchParams.get("sort") || "name";
    const inStockOnly = searchParams.get("inStock") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (inStockOnly) {
      where.inStock = true;
    }

    // Build orderBy
    let orderBy: any = { name: "asc" };
    if (sortBy === "price_asc") {
      orderBy = { price: "asc" };
    } else if (sortBy === "price_desc") {
      orderBy = { price: "desc" };
    } else if (sortBy === "category") {
      orderBy = [{ category: "asc" }, { name: "asc" }];
    }

    // Fetch products with supplier info
    const [products, totalCount] = await Promise.all([
      prisma.supplierProduct.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              rating: true,
              minimumOrder: true,
              deliveryFee: true,
              leadTimeDays: true,
            },
          },
        },
      }),
      prisma.supplierProduct.count({ where }),
    ]);

    // Get all categories for filter options
    const categories = await prisma.supplierProduct.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { category: "asc" },
    });

    // Get all suppliers for filter options
    const suppliers = await prisma.supplier.findMany({
      where: { status: "VERIFIED" },
      select: {
        id: true,
        name: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    // Format products for JSON
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      unit: product.unit,
      inStock: product.inStock,
      supplier: {
        id: product.supplier.id,
        name: product.supplier.name,
        rating: product.supplier.rating ? Number(product.supplier.rating) : null,
        minimumOrder: product.supplier.minimumOrder
          ? Number(product.supplier.minimumOrder)
          : null,
        deliveryFee: product.supplier.deliveryFee
          ? Number(product.supplier.deliveryFee)
          : null,
        leadTimeDays: product.supplier.leadTimeDays,
      },
    }));

    // Group similar products for price comparison
    const productGroups: Record<string, typeof formattedProducts> = {};
    formattedProducts.forEach((product) => {
      // Normalize product name for grouping (lowercase, remove extra spaces)
      const normalizedName = product.name.toLowerCase().trim();
      if (!productGroups[normalizedName]) {
        productGroups[normalizedName] = [];
      }
      productGroups[normalizedName].push(product);
    });

    // Find products with multiple suppliers (for price comparison)
    const comparableProducts = Object.entries(productGroups)
      .filter(([_, products]) => products.length > 1)
      .map(([name, products]) => ({
        name: products[0].name,
        category: products[0].category,
        suppliers: products.sort((a, b) => a.price - b.price),
        lowestPrice: Math.min(...products.map((p) => p.price)),
        highestPrice: Math.max(...products.map((p) => p.price)),
        savings: Math.max(...products.map((p) => p.price)) - Math.min(...products.map((p) => p.price)),
      }));

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
        filters: {
          categories: categories.map((c) => ({
            name: c.category,
            count: c._count.category,
          })),
          suppliers: suppliers.map((s) => ({
            id: s.id,
            name: s.name,
            productCount: s._count.products,
          })),
        },
        priceComparisons: comparableProducts.slice(0, 10),
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", details: error?.message },
      { status: 500 }
    );
  }
}
