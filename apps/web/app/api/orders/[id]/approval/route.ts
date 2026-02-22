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

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: user.restaurant.id,
        status: "AWAITING_APPROVAL",
      },
      include: { supplier: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found or not awaiting approval" }, { status: 404 });
    }

    // Find the pending approval
    const approval = await prisma.orderApproval.findFirst({
      where: { orderId, status: "PENDING" },
      include: { requestedBy: true },
    });

    if (!approval) {
      return NextResponse.json({ error: "No pending approval found" }, { status: 404 });
    }

    // Update approval record
    await prisma.orderApproval.update({
      where: { id: approval.id },
      data: {
        status,
        notes,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    const reviewerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    if (status === "APPROVED") {
      // Calculate expected delivery date
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + order.supplier.leadTimeDays);

      // Transition to PENDING
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "PENDING", deliveryDate },
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

      // Notify requester
      await prisma.notification.create({
        data: {
          type: "ORDER_UPDATE",
          title: "Order Approved",
          message: `Your order ${order.orderNumber} has been approved by ${reviewerName} and submitted to the supplier.`,
          userId: approval.requestedById,
          metadata: { orderId, status: "APPROVED" },
        },
      });

      // Send approval decision email to requester
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
    } else {
      // REJECTED — transition back to DRAFT
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "DRAFT" },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          type: "ORDER_UPDATE",
          title: "Order Rejected",
          message: `Your order ${order.orderNumber} was rejected by ${reviewerName}.${notes ? ` Reason: ${notes}` : ""}`,
          userId: approval.requestedById,
          metadata: { orderId, status: "REJECTED", notes },
        },
      });

      // Send rejection email to requester
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
    }
  } catch (error: any) {
    console.error("Review approval error:", error);
    return NextResponse.json(
      { error: "Failed to review approval", details: error?.message },
      { status: 500 }
    );
  }
}
