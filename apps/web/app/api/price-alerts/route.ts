import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreatePriceAlertSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// GET all price alerts for user
export async function GET() {
  try {
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

    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            supplier: {
              select: { id: true, name: true },
            },
            priceHistory: {
              orderBy: { recordedAt: "desc" },
              take: 30,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format alerts
    const formattedAlerts = alerts.map((alert) => ({
      id: alert.id,
      alertType: alert.alertType,
      targetPrice: Number(alert.targetPrice),
      isActive: alert.isActive,
      triggeredAt: alert.triggeredAt,
      triggeredPrice: alert.triggeredPrice ? Number(alert.triggeredPrice) : null,
      createdAt: alert.createdAt,
      product: {
        id: alert.product.id,
        name: alert.product.name,
        currentPrice: Number(alert.product.price),
        unit: alert.product.unit,
        category: alert.product.category,
        supplier: alert.product.supplier,
        priceHistory: alert.product.priceHistory.map((ph) => ({
          price: Number(ph.price),
          recordedAt: ph.recordedAt,
        })),
      },
    }));

    return NextResponse.json({
      success: true,
      data: formattedAlerts,
    });
  } catch (error: any) {
    console.error("Price alerts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price alerts", details: error?.message },
      { status: 500 }
    );
  }
}

// POST create new price alert
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const validation = validateBody(CreatePriceAlertSchema, body);
    if (!validation.success) return validation.response;
    const { productId, alertType, targetPrice } = validation.data;

    // Check if product exists
    const product = await prisma.supplierProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if alert already exists for this product
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        userId: user.id,
        productId,
        isActive: true,
      },
    });

    if (existingAlert) {
      return NextResponse.json(
        { error: "An active alert already exists for this product" },
        { status: 400 }
      );
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: user.id,
        productId,
        alertType,
        targetPrice,
      },
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
        createdAt: alert.createdAt,
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
    console.error("Price alert create error:", error);
    return NextResponse.json(
      { error: "Failed to create price alert", details: error?.message },
      { status: 500 }
    );
  }
}
