import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Public active promotions (for restaurant marketplace)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    const now = new Date();

    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        ...(supplierId && { supplierId }),
        supplier: { status: "VERIFIED" },
      },
      include: {
        supplier: { select: { id: true, name: true, logoUrl: true } },
        products: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: promotions.map((p) => ({
        id: p.id,
        type: p.type,
        value: Number(p.value),
        minOrderAmount: p.minOrderAmount ? Number(p.minOrderAmount) : null,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        buyQuantity: p.buyQuantity,
        getQuantity: p.getQuantity,
        supplier: p.supplier,
        productCount: p.products.length,
      })),
    });
  } catch (error: any) {
    console.error("Public promotions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 }
    );
  }
}
