import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UpdateReturnRequestSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { inngest } from "@/lib/inngest/client";

// GET - Get return request detail for supplier
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { id } = await params;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        order: { supplierId: user.supplier.id },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            restaurant: {
              select: { id: true, name: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...returnRequest,
        creditAmount: returnRequest.creditAmount ? Number(returnRequest.creditAmount) : null,
      },
    });
  } catch (error: any) {
    console.error("Get supplier return detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return request" },
      { status: 500 }
    );
  }
}

// PATCH - Process return action
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        order: { supplierId: user.supplier.id },
      },
      include: {
        order: {
          select: {
            id: true,
            restaurantId: true,
            supplierId: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateBody(UpdateReturnRequestSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const previousStatus = returnRequest.status;
    let updateData: any = {
      reviewedById: user.id,
      reviewedAt: new Date(),
    };

    switch (data.action) {
      case "approve":
        if (returnRequest.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only approve pending returns" },
            { status: 400 }
          );
        }
        updateData.status = "APPROVED";
        break;

      case "reject":
        if (returnRequest.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only reject pending returns" },
            { status: 400 }
          );
        }
        updateData.status = "REJECTED";
        if (data.resolution) updateData.resolution = data.resolution;
        break;

      case "resolve":
        if (returnRequest.status !== "APPROVED") {
          return NextResponse.json(
            { error: "Can only resolve approved returns" },
            { status: 400 }
          );
        }
        updateData.status = "RESOLVED";
        updateData.resolvedAt = new Date();
        if (data.resolution) updateData.resolution = data.resolution;

        // Update order status to RETURNED for full returns — only if order is DELIVERED
        const relatedOrder = await prisma.order.findUnique({
          where: { id: returnRequest.orderId },
          select: { status: true },
        });
        if (relatedOrder && relatedOrder.status !== "DELIVERED") {
          return NextResponse.json(
            { error: `Cannot mark order as RETURNED — order status is ${relatedOrder.status}, expected DELIVERED` },
            { status: 400 }
          );
        }
        await prisma.order.update({
          where: { id: returnRequest.orderId },
          data: { status: "RETURNED" },
        });
        break;

      case "issue_credit":
        if (!["APPROVED", "RESOLVED"].includes(returnRequest.status)) {
          return NextResponse.json(
            { error: "Can only issue credit for approved or resolved returns" },
            { status: 400 }
          );
        }
        updateData.status = "CREDIT_ISSUED";
        updateData.resolvedAt = new Date();
        if (data.creditAmount !== undefined) updateData.creditAmount = data.creditAmount;
        if (data.creditNotes) updateData.creditNotes = data.creditNotes;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: updateData,
    });

    // Emit Inngest event (fire-and-forget)
    inngest.send({
      name: "return/status.changed",
      data: {
        returnId: id,
        orderId: returnRequest.orderId,
        previousStatus,
        newStatus: updated.status,
        restaurantId: returnRequest.order.restaurantId,
        supplierId: returnRequest.order.supplierId,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        creditAmount: updated.creditAmount ? Number(updated.creditAmount) : null,
      },
    });
  } catch (error: any) {
    console.error("Update return error:", error);
    return NextResponse.json(
      { error: "Failed to update return request" },
      { status: 500 }
    );
  }
}
