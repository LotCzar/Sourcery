import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import { inngest } from "@/lib/inngest/client";
import { UpdateDeliverySchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// GET - Get delivery detail
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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || user.role !== "DRIVER") {
      return NextResponse.json(
        { error: "Driver access required" },
        { status: 403 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        driverId: user.id,
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
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
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
        })),
      },
    });
  } catch (error: any) {
    console.error("Get delivery detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery" },
      { status: 500 }
    );
  }
}

// PATCH - Driver updates delivery status
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
      include: { supplier: true },
    });

    if (!user || user.role !== "DRIVER") {
      return NextResponse.json(
        { error: "Driver access required" },
        { status: 403 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        driverId: user.id,
      },
      include: {
        restaurant: {
          select: { name: true, email: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateBody(UpdateDeliverySchema, body);
    if (!validation.success) return validation.response;

    const { action, estimatedDeliveryAt, trackingNotes } = validation.data;
    let updatedOrder;

    switch (action) {
      case "out_for_delivery": {
        if (order.status !== "SHIPPED") {
          return NextResponse.json(
            { error: "Can only start delivery for shipped orders" },
            { status: 400 }
          );
        }

        const transitData: any = {
          status: "IN_TRANSIT",
          inTransitAt: new Date(),
        };
        if (estimatedDeliveryAt) {
          transitData.estimatedDeliveryAt = new Date(estimatedDeliveryAt);
        }
        if (trackingNotes) {
          transitData.trackingNotes = trackingNotes;
        }

        updatedOrder = await prisma.order.update({
          where: { id },
          data: transitData,
        });

        // Notify restaurant
        const transitUser = await prisma.user.findFirst({
          where: { restaurantId: order.restaurantId },
        });
        if (transitUser) {
          await prisma.notification.create({
            data: {
              type: "DELIVERY_UPDATE",
              title: "Order Out for Delivery",
              message: `Your order ${order.orderNumber} is out for delivery!${estimatedDeliveryAt ? ` ETA: ${new Date(estimatedDeliveryAt).toLocaleString()}.` : ""}`,
              userId: transitUser.id,
              metadata: { orderId: id },
            },
          });
        }

        if (order.restaurant.email) {
          const template = emailTemplates.orderOutForDelivery(
            order.orderNumber,
            order.supplier.name,
            estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : undefined
          );
          sendEmail({
            to: order.restaurant.email,
            subject: template.subject,
            html: template.html,
          });
        }
        break;
      }

      case "update_eta": {
        if (order.status !== "SHIPPED" && order.status !== "IN_TRANSIT") {
          return NextResponse.json(
            { error: "Can only update ETA for shipped or in-transit orders" },
            { status: 400 }
          );
        }

        if (!estimatedDeliveryAt) {
          return NextResponse.json(
            { error: "estimatedDeliveryAt is required" },
            { status: 400 }
          );
        }

        const etaData: any = {
          estimatedDeliveryAt: new Date(estimatedDeliveryAt),
        };
        if (trackingNotes) {
          etaData.trackingNotes = trackingNotes;
        }

        updatedOrder = await prisma.order.update({
          where: { id },
          data: etaData,
        });

        const etaUser = await prisma.user.findFirst({
          where: { restaurantId: order.restaurantId },
        });
        if (etaUser) {
          await prisma.notification.create({
            data: {
              type: "DELIVERY_UPDATE",
              title: "Delivery ETA Updated",
              message: `The ETA for order ${order.orderNumber} has been updated to ${new Date(estimatedDeliveryAt).toLocaleString()}.`,
              userId: etaUser.id,
              metadata: { orderId: id },
            },
          });
        }

        if (order.restaurant.email) {
          const template = emailTemplates.deliveryEtaUpdated(
            order.orderNumber,
            order.supplier.name,
            new Date(estimatedDeliveryAt)
          );
          sendEmail({
            to: order.restaurant.email,
            subject: template.subject,
            html: template.html,
          });
        }
        break;
      }

      case "deliver": {
        if (order.status !== "SHIPPED" && order.status !== "IN_TRANSIT") {
          return NextResponse.json(
            { error: "Can only deliver shipped or in-transit orders" },
            { status: 400 }
          );
        }

        const deliverResult = await prisma.$transaction(async (tx) => {
          const deliveredOrder = await tx.order.update({
            where: { id },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(),
            },
          });

          const existingInvoice = await tx.invoice.findUnique({
            where: { orderId: id },
          });
          if (existingInvoice) {
            return { order: deliveredOrder, invoice: existingInvoice };
          }

          const invoiceCount = await tx.invoice.count({
            where: { supplierId: order.supplierId },
          });
          const invoiceNumber = `INV-${order.supplierId.slice(-4).toUpperCase()}-${String(invoiceCount + 1).padStart(5, "0")}`;

          const invoice = await tx.invoice.create({
            data: {
              invoiceNumber,
              supplierId: order.supplierId,
              restaurantId: deliveredOrder.restaurantId,
              orderId: deliveredOrder.id,
              subtotal: deliveredOrder.subtotal,
              tax: deliveredOrder.tax,
              total: deliveredOrder.total,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: "PENDING",
            },
          });

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

          return { order: deliveredOrder, invoice };
        });

        updatedOrder = deliverResult.order;

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
            restaurantId: order.restaurantId,
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
        discount: Number(updatedOrder.discount),
        total: Number(updatedOrder.total),
      },
    });
  } catch (error: any) {
    console.error("Update delivery error:", error);
    return NextResponse.json(
      { error: "Failed to update delivery" },
      { status: 500 }
    );
  }
}
