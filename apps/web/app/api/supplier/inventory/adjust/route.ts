import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { StockAdjustmentSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// POST - Quick stock adjustments
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
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(StockAdjustmentSchema, body);
    if (!validation.success) return validation.response;
    const { adjustments } = validation.data;

    const supplierId = user.supplier.id;

    // Validate all products belong to this supplier
    const productIds = adjustments.map((a) => a.productId);
    const products = await prisma.supplierProduct.findMany({
      where: {
        id: { in: productIds },
        supplierId,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const results: { updated: string[]; failed: string[] } = {
      updated: [],
      failed: [],
    };

    for (const adj of adjustments) {
      const product = productMap.get(adj.productId);
      if (!product) {
        results.failed.push(adj.productId);
        continue;
      }

      const currentQty = product.stockQuantity ?? 0;
      const newQty = Math.max(0, currentQty + adj.quantity);

      await prisma.supplierProduct.update({
        where: { id: adj.productId },
        data: {
          stockQuantity: newQty,
          inStock: newQty > 0,
        },
      });

      results.updated.push(adj.productId);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("Stock adjustment error:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
