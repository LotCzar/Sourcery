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
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { products: [], suppliers: [], orders: [] },
      });
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

    // Search in parallel
    const [products, suppliers, orders] = await Promise.all([
      // Search products
      prisma.supplierProduct.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
        },
        take: 5,
        orderBy: { name: "asc" },
      }),

      // Search suppliers
      prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          _count: { select: { products: true } },
        },
        take: 5,
        orderBy: { name: "asc" },
      }),

      // Search orders
      prisma.order.findMany({
        where: {
          restaurantId: user.restaurant.id,
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { supplier: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          _count: { select: { items: true } },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Format results
    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      unit: p.unit,
      supplier: p.supplier.name,
      supplierId: p.supplier.id,
    }));

    const formattedSuppliers = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      location: s.city && s.state ? `${s.city}, ${s.state}` : null,
      productCount: s._count.products,
    }));

    const formattedOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      supplier: o.supplier.name,
      supplierId: o.supplier.id,
      itemCount: o._count.items,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
        suppliers: formattedSuppliers,
        orders: formattedOrders,
      },
      query,
    });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error?.message },
      { status: 500 }
    );
  }
}
