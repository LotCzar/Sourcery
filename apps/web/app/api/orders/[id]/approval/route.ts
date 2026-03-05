import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import { ReviewApprovalSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// POST - Review (approve/reject) an order approval
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(ReviewApprovalSchema, body);
    if (!validation.success) return validation.response;

    const { status, notes } = validation.data;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions to review approvals" }, { status: 403 });
    }

    const restaurantId = user.restaurant!.id;
    const restaurantName = user.restaurant!.name;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          restaurantId,
          status: "AWAITING_APPROVAL",
        },
        include: { supplier: true },
      });

      if (!order) {
        return { error: "Order not found or not awaiting approval", status: 404 } as const;
      }

      const approval = await tx.orderApproval.findFirst({
        where: { orderId, status: "PENDING" },
        include: { requestedBy: true },
      });

      if (!approval) {
        return { error: "No pending approval found", status: 404 } as const;
      }

      await tx.orderApproval.update({
        where: { id: approval.id },
        data: {
          status,
          notes,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      if (status === "APPROVED") {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + order.supplier.leadTimeDays);

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: "PENDING", deliveryDate },
        });

        await tx.notification.create({
          data: {
            type: "ORDER_UPDATE",
            title: "Order Approved",
            message: `Your order ${order.orderNumber} has been approved and submitted to the supplier.`,
            userId: approval.requestedById,
            metadata: { orderId, status: "APPROVED" },
          },
        });

        return { order, approval, updatedOrder } as const;
      } else {
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: "DRAFT" },
        });

        await tx.notification.create({
          data: {
            type: "ORDER_UPDATE",
            title: "Order Rejected",
            message: `Your order ${order.orderNumber} was rejected.${notes ? ` Reason: ${notes}` : ""}`,
            userId: approval.requestedById,
            metadata: { orderId, status: "REJECTED", notes },
          },
        });

        return { order, approval, updatedOrder } as const;
      }
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { order, approval, updatedOrder } = result;
    const reviewerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    // Send emails outside the transaction
    if (status === "APPROVED") {
      if (order.supplier.email) {
        const template = emailTemplates.orderPlaced(
          order.orderNumber,
          restaurantName,
          Number(order.total)
        );
        sendEmail({
          to: order.supplier.email,
          subject: template.subject,
          html: template.html,
        });
      }

      if (approval.requestedBy.email) {
        const template = emailTemplates.approvalDecision(
          order.orderNumber,
          "APPROVED",
          reviewerName,
          notes
        );
        sendEmail({
          to: approval.requestedBy.email,
          subject: template.subject,
          html: template.html,
        });
      }
    } else {
      if (approval.requestedBy.email) {
        const template = emailTemplates.approvalDecision(
          order.orderNumber,
          "REJECTED",
          reviewerName,
          notes
        );
        sendEmail({
          to: approval.requestedBy.email,
          subject: template.subject,
          html: template.html,
        });
      }
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
    console.error("Review approval error:", error);
    return NextResponse.json(
      { error: "Failed to review approval" },
      { status: 500 }
    );
  }
}
