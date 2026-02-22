import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Bulk update supplier product prices
export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 });
    }

    if (updates.length > 100) {
      return NextResponse.json({ error: "Maximum 100 items per batch" }, { status: 400 });
    }

    // Validate all products belong to this supplier
    const productIds = updates.map((u: any) => u.productId);
    const products = await prisma.supplierProduct.findMany({
      where: {
        id: { in: productIds },
        supplierId: user.supplier.id,
      },
    });

    const validProductIds = new Set(products.map((p) => p.id));
    const results: { updated: number; failed: number; errors: string[] } = {
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const update of updates) {
      if (!validProductIds.has(update.productId)) {
        results.failed++;
        results.errors.push(`Product ${update.productId} not found or not owned by supplier`);
        continue;
      }

      try {
        const product = products.find((p) => p.id === update.productId)!;

        // Update the product
        await prisma.supplierProduct.update({
          where: { id: update.productId },
          data: {
            ...(update.price !== undefined ? { price: update.price } : {}),
            ...(update.inStock !== undefined ? { inStock: update.inStock } : {}),
          },
        });

        // Create price history entry if price changed
        if (update.price !== undefined && Number(product.price) !== update.price) {
          await prisma.priceHistory.create({
            data: {
              productId: update.productId,
              price: update.price,
            },
          });
        }

        results.updated++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Failed to update product ${update.productId}: ${err?.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Failed to bulk update products", details: error?.message },
      { status: 500 }
    );
  }
}
