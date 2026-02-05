import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get single order details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's supplier
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

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        supplierId: user.supplier.id,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                unit: true,
                price: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        deliveryFee: Number(order.deliveryFee),
        discount: Number(order.discount),
        total: Number(order.total),
        items: order.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          product: {
            ...item.product,
            price: Number(item.product.price),
          },
        })),
      },
    });
  } catch (error: any) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH - Update order status (supplier actions)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's supplier
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

    const body = await request.json();
    const { action } = body;

    // Get the order
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        supplierId: user.supplier.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let updatedOrder;

    switch (action) {
      case "confirm":
        // Supplier confirms the order (PENDING → CONFIRMED)
        if (order.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only confirm pending orders" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id: params.id },
          data: { status: "CONFIRMED" },
        });
        break;

      case "ship":
        // Mark order as shipped (CONFIRMED → SHIPPED)
        if (order.status !== "CONFIRMED") {
          return NextResponse.json(
            { error: "Can only ship confirmed orders" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id: params.id },
          data: { status: "SHIPPED" },
        });
        break;

      case "deliver":
        // Mark order as delivered (SHIPPED → DELIVERED)
        if (order.status !== "SHIPPED") {
          return NextResponse.json(
            { error: "Can only mark shipped orders as delivered" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id: params.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });
        break;

      case "reject":
        // Supplier rejects the order (PENDING → CANCELLED)
        if (order.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only reject pending orders" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id: params.id },
          data: { status: "CANCELLED" },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedOrder,
        subtotal: Number(updatedOrder.subtotal),
        tax: Number(updatedOrder.tax),
        deliveryFee: Number(updatedOrder.deliveryFee),
        discount: Number(updatedOrder.discount),
        total: Number(updatedOrder.total),
      },
    });
  } catch (error: any) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "Failed to update order", details: error?.message },
      { status: 500 }
    );
  }
}
