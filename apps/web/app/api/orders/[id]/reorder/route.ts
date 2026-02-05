import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Create a new order from an existing order's items
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's restaurant
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Get the original order with items
    const originalOrder = await prisma.order.findFirst({
      where: {
        id: params.id,
        restaurantId: user.restaurant.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
      },
    });

    if (!originalOrder) {
      return NextResponse.json(
        { error: "Original order not found" },
        { status: 404 }
      );
    }

    // Check if supplier is still active
    if (originalOrder.supplier.status !== "VERIFIED") {
      return NextResponse.json(
        { error: "Supplier is no longer available" },
        { status: 400 }
      );
    }

    // Calculate new totals using current product prices
    let subtotal = 0;
    const orderItems = [];

    for (const item of originalOrder.items) {
      // Get current price of product
      const currentProduct = await prisma.supplierProduct.findUnique({
        where: { id: item.productId },
      });

      if (!currentProduct) {
        // Product no longer exists, skip it
        continue;
      }

      const unitPrice = Number(currentProduct.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: "No products from original order are still available" },
        { status: 400 }
      );
    }

    // Calculate tax and delivery fee
    const taxRate = 0.0825; // 8.25% tax rate
    const tax = subtotal * taxRate;
    const deliveryFee = originalOrder.supplier.deliveryFee
      ? Number(originalOrder.supplier.deliveryFee)
      : 0;
    const total = subtotal + tax + deliveryFee;

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { restaurantId: user.restaurant.id },
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, "0")}`;

    // Create new order
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId: user.restaurant.id,
        supplierId: originalOrder.supplierId,
        createdById: user.id,
        status: "DRAFT",
        subtotal,
        tax,
        deliveryFee,
        total,
        items: {
          create: orderItems,
        },
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newOrder,
        subtotal: Number(newOrder.subtotal),
        tax: Number(newOrder.tax),
        deliveryFee: Number(newOrder.deliveryFee),
        total: Number(newOrder.total),
        items: newOrder.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
      },
      message: `New order created from ${originalOrder.orderNumber}`,
    });
  } catch (error: any) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "Failed to create reorder", details: error?.message },
      { status: 500 }
    );
  }
}
