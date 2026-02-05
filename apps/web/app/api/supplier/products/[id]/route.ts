import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get single product
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const product = await prisma.supplierProduct.findFirst({
      where: {
        id: params.id,
        supplierId: user.supplier.id,
      },
      include: {
        priceHistory: {
          orderBy: { recordedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        price: Number(product.price),
        packSize: product.packSize ? Number(product.packSize) : null,
        priceHistory: product.priceHistory.map((ph) => ({
          ...ph,
          price: Number(ph.price),
        })),
      },
    });
  } catch (error: any) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH - Update product
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check product belongs to supplier
    const existingProduct = await prisma.supplierProduct.findFirst({
      where: {
        id: params.id,
        supplierId: user.supplier.id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const data = await request.json();

    // Build update data
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.packSize !== undefined) {
      updateData.packSize = data.packSize ? parseFloat(data.packSize) : null;
    }
    if (data.inStock !== undefined) updateData.inStock = data.inStock;
    if (data.stockQuantity !== undefined) {
      updateData.stockQuantity = data.stockQuantity
        ? parseInt(data.stockQuantity)
        : null;
    }

    // Handle price update with history tracking
    if (data.price !== undefined) {
      const newPrice = parseFloat(data.price);
      if (Number(existingProduct.price) !== newPrice) {
        updateData.price = newPrice;
        // Record price change in history
        await prisma.priceHistory.create({
          data: {
            productId: params.id,
            price: newPrice,
          },
        });
      }
    }

    const product = await prisma.supplierProduct.update({
      where: { id: params.id },
      data: updateData,
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
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check product belongs to supplier
    const product = await prisma.supplierProduct.findFirst({
      where: {
        id: params.id,
        supplierId: user.supplier.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if product is used in any orders
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: params.id },
    });

    if (orderItemCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete product that has been ordered. Consider marking it as out of stock instead.",
        },
        { status: 400 }
      );
    }

    // Delete price history first
    await prisma.priceHistory.deleteMany({
      where: { productId: params.id },
    });

    // Delete product
    await prisma.supplierProduct.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product", details: error?.message },
      { status: 500 }
    );
  }
}
