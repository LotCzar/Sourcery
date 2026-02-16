import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DELETE a price alert
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if alert exists and belongs to user
    const alert = await prisma.priceAlert.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await prisma.priceAlert.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: "Alert deleted successfully",
    });
  } catch (error: any) {
    console.error("Price alert delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete price alert", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH update a price alert
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if alert exists and belongs to user
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (!existingAlert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const body = await request.json();
    const { isActive, targetPrice, alertType } = body;

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (targetPrice !== undefined) updateData.targetPrice = targetPrice;
    if (alertType !== undefined) updateData.alertType = alertType;

    // Reset triggered status if reactivating
    if (isActive === true && !existingAlert.isActive) {
      updateData.triggeredAt = null;
      updateData.triggeredPrice = null;
    }

    const alert = await prisma.priceAlert.update({
      where: { id: id },
      data: updateData,
      include: {
        product: {
          include: {
            supplier: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: alert.id,
        alertType: alert.alertType,
        targetPrice: Number(alert.targetPrice),
        isActive: alert.isActive,
        triggeredAt: alert.triggeredAt,
        triggeredPrice: alert.triggeredPrice ? Number(alert.triggeredPrice) : null,
        product: {
          id: alert.product.id,
          name: alert.product.name,
          currentPrice: Number(alert.product.price),
          unit: alert.product.unit,
          supplier: alert.product.supplier,
        },
      },
    });
  } catch (error: any) {
    console.error("Price alert update error:", error);
    return NextResponse.json(
      { error: "Failed to update price alert", details: error?.message },
      { status: 500 }
    );
  }
}
