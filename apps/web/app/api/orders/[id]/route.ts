import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import { UpdateOrderSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { inngest } from "@/lib/inngest/client";

// GET single order details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: user.restaurant.id,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            minimumOrder: true,
            deliveryFee: true,
            leadTimeDays: true,
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
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Format for JSON
    const formattedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      supplier: {
        ...order.supplier,
        minimumOrder: order.supplier.minimumOrder
          ? Number(order.supplier.minimumOrder)
          : null,
        deliveryFee: order.supplier.deliveryFee
          ? Number(order.supplier.deliveryFee)
          : null,
      },
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
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH - Update order (submit, cancel, etc.)
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

    const body = await request.json();
    const validation = validateBody(UpdateOrderSchema, body);
    if (!validation.success) return validation.response;
    const { action } = validation.data;

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

    // Get the order
    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: user.restaurant.id,
      },
      include: {
        supplier: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let updatedOrder;

    switch (action) {
      case "submit": {
        // Can only submit DRAFT orders
        if (order.status !== "DRAFT") {
          return NextResponse.json(
            { error: "Can only submit draft orders" },
            { status: 400 }
          );
        }

        // Calculate expected delivery date based on supplier lead time
        const deliveryDate = new Date();
        deliveryDate.setDate(
          deliveryDate.getDate() + order.supplier.leadTimeDays
        );

        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            status: "PENDING",
            deliveryDate,
          },
        });

        // Send email to supplier
        if (order.supplier.email) {
          const template = emailTemplates.orderPlaced(
            order.orderNumber,
            user.restaurant.name,
            Number(order.total)
          );
          sendEmail({
            to: order.supplier.email,
            subject: template.subject,
            html: template.html,
          });
        }
        break;
      }

      case "cancel":
        // Can only cancel DRAFT or PENDING orders
        if (!["DRAFT", "PENDING"].includes(order.status)) {
          return NextResponse.json(
            { error: "Can only cancel draft or pending orders" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            status: "CANCELLED",
          },
        });
        break;

      case "confirm":
        // Supplier confirms order (changes PENDING to CONFIRMED)
        if (order.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only confirm pending orders" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            status: "CONFIRMED",
          },
        });

        // Send confirmation email to restaurant
        if (user.restaurant.email) {
          const confirmTemplate = emailTemplates.orderConfirmed(
            order.orderNumber,
            order.supplier.name,
            user.restaurant.email
          );
          sendEmail({
            to: user.restaurant.email,
            subject: confirmTemplate.subject,
            html: confirmTemplate.html,
          });
        }
        break;

      case "ship":
        // Mark order as shipped
        if (order.status !== "CONFIRMED") {
          return NextResponse.json(
            { error: "Can only ship confirmed orders" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            status: "SHIPPED",
          },
        });

        // Send shipped email to restaurant
        if (user.restaurant.email) {
          const shipTemplate = emailTemplates.orderShipped(
            order.orderNumber,
            order.supplier.name
          );
          sendEmail({
            to: user.restaurant.email,
            subject: shipTemplate.subject,
            html: shipTemplate.html,
          });
        }
        break;

      case "deliver":
        // Mark order as delivered
        if (order.status !== "SHIPPED") {
          return NextResponse.json(
            { error: "Can only mark shipped orders as delivered" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });

        // Send delivered email to restaurant
        if (user.restaurant.email) {
          const deliverTemplate = emailTemplates.orderDelivered(
            order.orderNumber,
            `INV-${order.orderNumber}`,
            Number(order.total)
          );
          sendEmail({
            to: user.restaurant.email,
            subject: deliverTemplate.subject,
            html: deliverTemplate.html,
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Emit Inngest events for status changes
    inngest
      .send({
        name: "order/status.changed",
        data: {
          orderId: id,
          previousStatus: order.status,
          newStatus: updatedOrder.status,
          restaurantId: user.restaurant.id,
          supplierId: order.supplierId,
        },
      })
      .catch(() => {});

    if (updatedOrder.status === "DELIVERED") {
      inngest
        .send({
          name: "order/delivered",
          data: {
            orderId: id,
            restaurantId: user.restaurant.id,
            supplierId: order.supplierId,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedOrder,
        subtotal: Number(updatedOrder.subtotal),
        tax: Number(updatedOrder.tax),
        deliveryFee: Number(updatedOrder.deliveryFee),
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

// DELETE - Delete a draft order
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

    // Get the order
    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: user.restaurant.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Can only delete DRAFT orders
    if (order.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete draft orders" },
        { status: 400 }
      );
    }

    // Delete order items first, then the order
    await prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Order deleted",
    });
  } catch (error: any) {
    console.error("Delete order error:", error);
    return NextResponse.json(
      { error: "Failed to delete order", details: error?.message },
      { status: 500 }
    );
  }
}
