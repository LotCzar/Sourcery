import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        products: {
          orderBy: [
            { category: "asc" },
            { name: "asc" },
          ],
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Convert Decimal fields to numbers for JSON serialization
    const formattedSupplier = {
      ...supplier,
      minimumOrder: supplier.minimumOrder ? Number(supplier.minimumOrder) : null,
      deliveryFee: supplier.deliveryFee ? Number(supplier.deliveryFee) : null,
      rating: supplier.rating ? Number(supplier.rating) : null,
      products: supplier.products.map((product) => ({
        ...product,
        price: Number(product.price),
        packSize: product.packSize ? Number(product.packSize) : null,
      })),
    };

    return NextResponse.json({
      success: true,
      data: formattedSupplier,
    });
  } catch (error: any) {
    console.error("Get supplier error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier", details: error?.message },
      { status: 500 }
    );
  }
}
