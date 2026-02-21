import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const VALID_INVOICE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "PARTIALLY_PAID", "CANCELLED"],
  OVERDUE: ["PAID", "PARTIALLY_PAID", "CANCELLED", "DISPUTED"],
  PARTIALLY_PAID: ["PAID", "CANCELLED"],
  DISPUTED: ["PAID", "CANCELLED"],
};
// PAID and CANCELLED are terminal — not in the map.

// GET single invoice
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
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        restaurantId: user.restaurant.id,
      },
      include: {
        supplier: {
          select: { id: true, name: true, email: true, phone: true },
        },
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, unit: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
        paymentMethod: invoice.paymentMethod,
        paymentReference: invoice.paymentReference,
        notes: invoice.notes,
        fileUrl: invoice.fileUrl,
        supplier: invoice.supplier,
        order: invoice.order
          ? {
              id: invoice.order.id,
              orderNumber: invoice.order.orderNumber,
              status: invoice.order.status,
              items: invoice.order.items.map((item) => ({
                id: item.id,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                subtotal: Number(item.subtotal),
                product: item.product,
              })),
            }
          : null,
        createdAt: invoice.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH update invoice (including marking as paid)
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
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        restaurantId: user.restaurant.id,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      status,
      paidAmount,
      paymentMethod,
      paymentReference,
      notes,
      dueDate,
    } = body;

    // Validate status transitions
    if (status) {
      const allowedTransitions = VALID_INVOICE_TRANSITIONS[existingInvoice.status];
      if (!allowedTransitions) {
        return NextResponse.json(
          { error: `Cannot transition from ${existingInvoice.status}` },
          { status: 400 }
        );
      }
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Invalid transition from ${existingInvoice.status} to ${status}` },
          { status: 400 }
        );
      }

      // PARTIALLY_PAID requires a valid paidAmount
      if (status === "PARTIALLY_PAID") {
        if (!paidAmount || paidAmount <= 0) {
          return NextResponse.json(
            { error: "PARTIALLY_PAID requires paidAmount > 0" },
            { status: 400 }
          );
        }
        if (paidAmount >= Number(existingInvoice.total)) {
          return NextResponse.json(
            { error: "PARTIALLY_PAID requires paidAmount < total" },
            { status: 400 }
          );
        }
      }
    }

    const updateData: any = {};

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    // Handle payment
    if (status === "PAID") {
      updateData.paidAt = new Date();
      updateData.paidAmount = paidAmount || existingInvoice.total;
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      if (paymentReference) updateData.paymentReference = paymentReference;
    } else if (status === "PARTIALLY_PAID") {
      updateData.paidAmount = paidAmount;
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      if (paymentReference) updateData.paymentReference = paymentReference;
    }

    const invoice = await prisma.invoice.update({
      where: { id: id },
      data: updateData,
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        order: {
          select: { id: true, orderNumber: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total: Number(invoice.total),
        paidAt: invoice.paidAt,
        paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
        paymentMethod: invoice.paymentMethod,
      },
    });
  } catch (error: any) {
    console.error("Invoice update error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE invoice
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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: id,
        restaurantId: user.restaurant.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await prisma.invoice.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error: any) {
    console.error("Invoice delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice", details: error?.message },
      { status: 500 }
    );
  }
}
