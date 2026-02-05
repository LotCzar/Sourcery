import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List supplier products
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const inStock = searchParams.get("inStock");

    // Build where clause
    const where: any = {
      supplierId: user.supplier.id,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    if (inStock === "true") {
      where.inStock = true;
    } else if (inStock === "false") {
      where.inStock = false;
    }

    const products = await prisma.supplierProduct.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: products.map((product) => ({
        ...product,
        price: Number(product.price),
        packSize: product.packSize ? Number(product.packSize) : null,
      })),
    });
  } catch (error: any) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: Request) {
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

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.category || !data.price || !data.unit) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, price, unit" },
        { status: 400 }
      );
    }

    const product = await prisma.supplierProduct.create({
      data: {
        supplierId: user.supplier.id,
        name: data.name,
        description: data.description || null,
        sku: data.sku || null,
        category: data.category,
        brand: data.brand || null,
        imageUrl: data.imageUrl || null,
        price: parseFloat(data.price),
        unit: data.unit,
        packSize: data.packSize ? parseFloat(data.packSize) : null,
        inStock: data.inStock !== false,
        stockQuantity: data.stockQuantity ? parseInt(data.stockQuantity) : null,
      },
    });

    // Create initial price history entry
    await prisma.priceHistory.create({
      data: {
        productId: product.id,
        price: product.price,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        price: Number(product.price),
        packSize: product.packSize ? Number(product.packSize) : null,
      },
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product", details: error?.message },
      { status: 500 }
    );
  }
}
