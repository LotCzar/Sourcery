import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { CreatePromotionSchema } from "@/lib/validations";

// GET - List promotions for supplier
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
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // active | scheduled | expired

    const now = new Date();
    let where: any = { supplierId: user.supplier.id };

    if (status === "active") {
      where = { ...where, isActive: true, startDate: { lte: now }, endDate: { gte: now } };
    } else if (status === "scheduled") {
      where = { ...where, startDate: { gt: now } };
    } else if (status === "expired") {
      where = { ...where, OR: [{ endDate: { lt: now } }, { isActive: false }] };
    }

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        products: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: promotions.map((p) => ({
        ...p,
        value: Number(p.value),
        minOrderAmount: p.minOrderAmount ? Number(p.minOrderAmount) : null,
      })),
    });
  } catch (error: any) {
    console.error("Supplier promotions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 }
    );
  }
}

// POST - Create promotion
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

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json({ error: "Only admins can create promotions" }, { status: 403 });
    }

    const rawBody = await request.json();
    const validation = validateBody(CreatePromotionSchema, rawBody);
    if (!validation.success) return validation.response;

    const { productIds, ...promotionData } = validation.data;

    const promotion = await prisma.promotion.create({
      data: {
        ...promotionData,
        value: promotionData.value,
        minOrderAmount: promotionData.minOrderAmount ?? null,
        buyQuantity: promotionData.buyQuantity ?? null,
        getQuantity: promotionData.getQuantity ?? null,
        startDate: new Date(promotionData.startDate),
        endDate: new Date(promotionData.endDate),
        supplierId: user.supplier.id,
        ...(productIds?.length && {
          products: { connect: productIds.map((id) => ({ id })) },
        }),
      },
      include: {
        products: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...promotion,
        value: Number(promotion.value),
        minOrderAmount: promotion.minOrderAmount ? Number(promotion.minOrderAmount) : null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Create promotion error:", error);
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}
