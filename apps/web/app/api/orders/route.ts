import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Generate a unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export async function GET(request: Request) {
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

    // Get orders for this restaurant
    const orders = await prisma.order.findMany({
      where: { restaurantId: user.restaurant.id },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format decimal fields for JSON serialization
    const formattedOrders = orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          ...item.product,
          price: Number(item.product.price),
        },
      })),
    }));

    return NextResponse.json({ success: true, data: formattedOrders });
  } catch (error: any) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: "Failed to get orders", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, supplierId, deliveryNotes } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order items are required" },
        { status: 400 }
      );
    }

    if (!supplierId) {
      return NextResponse.json(
        { error: "Supplier ID is required" },
        { status: 400 }
      );
    }

    // Get user and their restaurant
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

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Get product details and calculate totals
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.supplierProduct.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate order items with prices
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const itemSubtotal = Number(product.price) * Number(item.quantity);
      subtotal += itemSubtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: itemSubtotal,
        notes: item.notes || null,
      };
    });

    const taxRate = 0.0825; // 8.25% tax rate
    const tax = subtotal * taxRate;
    const deliveryFee = Number(supplier.deliveryFee) || 0;
    const total = subtotal + tax + deliveryFee;

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: "DRAFT",
        subtotal,
        tax,
        deliveryFee,
        total,
        deliveryNotes: deliveryNotes || null,
        restaurantId: user.restaurant.id,
        supplierId,
        createdById: user.id,
        items: {
          create: orderItems,
        },
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Format response
    const formattedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          ...item.product,
          price: Number(item.product.price),
        },
      })),
    };

    return NextResponse.json({
      success: true,
      data: formattedOrder,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: error?.message },
      { status: 500 }
    );
  }
}
