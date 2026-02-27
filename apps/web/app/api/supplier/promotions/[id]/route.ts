import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { UpdatePromotionSchema } from "@/lib/validations";

// GET - Promotion detail
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const promotion = await prisma.promotion.findFirst({
      where: { id, supplierId: user.supplier.id },
      include: {
        products: { select: { id: true, name: true, price: true, category: true } },
      },
    });

    if (!promotion) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...promotion,
        value: Number(promotion.value),
        minOrderAmount: promotion.minOrderAmount ? Number(promotion.minOrderAmount) : null,
        products: promotion.products.map((p) => ({
          ...p,
          price: Number(p.price),
        })),
      },
    });
  } catch (error: any) {
    console.error("Get promotion error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotion" },
      { status: 500 }
    );
  }
}

// PATCH - Update promotion
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: "Only admins can update promotions" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.promotion.findFirst({
      where: { id, supplierId: user.supplier.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    const rawBody = await request.json();
    const validation = validateBody(UpdatePromotionSchema, rawBody);
    if (!validation.success) return validation.response;

    const { productIds, ...updateData } = validation.data;

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
        ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
        ...(productIds !== undefined && {
          products: { set: productIds.map((pid) => ({ id: pid })) },
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
    });
  } catch (error: any) {
    console.error("Update promotion error:", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

// DELETE - Delete promotion
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: "Only admins can delete promotions" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.promotion.findFirst({
      where: { id, supplierId: user.supplier.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    await prisma.promotion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete promotion error:", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 }
    );
  }
}
