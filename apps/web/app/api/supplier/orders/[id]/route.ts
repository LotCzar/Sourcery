import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import { inngest } from "@/lib/inngest/client";

// GET - Get single order details
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
        id: id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get the order with restaurant info
    const order = await prisma.order.findFirst({
      where: {
        id: id,
        supplierId: user.supplier.id,
      },
      include: {
        restaurant: {
          select: {
            name: true,
            email: true,
          },
        },
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
          where: { id: id },
          data: { status: "CONFIRMED" },
        });

        // Send email to restaurant
        if (order.restaurant.email) {
          const template = emailTemplates.orderConfirmed(
            order.orderNumber,
            user.supplier.name,
            order.restaurant.email
          );
          sendEmail({
            to: order.restaurant.email,
            subject: template.subject,
            html: template.html,
          });
        }
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
          where: { id: id },
          data: { status: "SHIPPED" },
        });

        // Send email to restaurant
        if (order.restaurant.email) {
          const template = emailTemplates.orderShipped(
            order.orderNumber,
            user.supplier.name
          );
          sendEmail({
            to: order.restaurant.email,
            subject: template.subject,
            html: template.html,
          });
        }
        break;

      case "deliver": {
        // Mark order as delivered (SHIPPED → DELIVERED) and auto-generate invoice
        if (order.status !== "SHIPPED") {
          return NextResponse.json(
            { error: "Can only mark shipped orders as delivered" },
            { status: 400 }
          );
        }

        const deliverResult = await prisma.$transaction(async (tx) => {
          // 1. Update order to DELIVERED
          const deliveredOrder = await tx.order.update({
            where: { id: id },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(),
            },
          });

          // 2. Check for existing invoice (idempotency)
          const existingInvoice = await tx.invoice.findUnique({
            where: { orderId: id },
          });
          if (existingInvoice) {
            return { order: deliveredOrder, invoice: existingInvoice };
          }

          // 3. Generate invoice number
          const invoiceCount = await tx.invoice.count({
            where: { supplierId: user.supplier!.id },
          });
          const invoiceNumber = `INV-${user.supplier!.id.slice(-4).toUpperCase()}-${String(invoiceCount + 1).padStart(5, "0")}`;

          // 4. Create invoice
          const invoice = await tx.invoice.create({
            data: {
              invoiceNumber,
              supplierId: user.supplier!.id,
              restaurantId: deliveredOrder.restaurantId,
              orderId: deliveredOrder.id,
              subtotal: deliveredOrder.subtotal,
              tax: deliveredOrder.tax,
              total: deliveredOrder.total,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              status: "PENDING",
            },
          });

          // 5. Create notification for restaurant
          const restaurantUser = await tx.user.findFirst({
            where: { restaurantId: deliveredOrder.restaurantId },
          });
          if (restaurantUser) {
            await tx.notification.create({
              data: {
                type: "ORDER_UPDATE",
                title: "Order Delivered - Invoice Created",
                message: `Your order has been delivered. Invoice ${invoiceNumber} has been generated for $${Number(deliveredOrder.total).toFixed(2)}.`,
                userId: restaurantUser.id,
                metadata: { orderId: deliveredOrder.id, invoiceId: invoice.id },
              },
            });
          }

          return { order: deliveredOrder, invoice, restaurantUser };
        });

        updatedOrder = deliverResult.order;

        // Send email to restaurant
        if (order.restaurant.email && deliverResult.invoice) {
          const template = emailTemplates.orderDelivered(
            order.orderNumber,
            deliverResult.invoice.invoiceNumber,
            Number(deliverResult.order.total)
          );
          sendEmail({
            to: order.restaurant.email,
            subject: template.subject,
            html: template.html,
          });
        }
        break;
      }

      case "reject":
        // Supplier rejects the order (PENDING → CANCELLED)
        if (order.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only reject pending orders" },
            { status: 400 }
          );
        }

        updatedOrder = await prisma.order.update({
          where: { id: id },
          data: { status: "CANCELLED" },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Emit Inngest events
    inngest
      .send({
        name: "order/status.changed",
        data: {
          orderId: id,
          previousStatus: order.status,
          newStatus: updatedOrder.status,
          restaurantId: order.restaurantId,
          supplierId: user.supplier.id,
        },
      })
      .catch(() => {});

    if (updatedOrder.status === "DELIVERED") {
      inngest
        .send({
          name: "order/delivered",
          data: {
            orderId: id,
            restaurantId: order.restaurantId,
            supplierId: user.supplier.id,
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
