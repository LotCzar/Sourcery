import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UpdateSupplierInvoiceSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// GET - Get single invoice
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
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
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            deliveredAt: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.supplierId !== user.supplier.id) {
      return NextResponse.json(
        { error: "Invoice does not belong to this supplier" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
        order: invoice.order
          ? {
              ...invoice.order,
              items: invoice.order.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                subtotal: Number(item.subtotal),
              })),
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PATCH - Update invoice (mark as paid, add notes, etc.)
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

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.supplierId !== user.supplier.id) {
      return NextResponse.json(
        { error: "Invoice does not belong to this supplier" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(UpdateSupplierInvoiceSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const VALID_INVOICE_TRANSITIONS: Record<string, string[]> = {
      PENDING: ["PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"],
      OVERDUE: ["PAID", "PARTIALLY_PAID", "CANCELLED", "DISPUTED"],
      PARTIALLY_PAID: ["PAID", "CANCELLED"],
      DISPUTED: ["PAID", "CANCELLED"],
    };

    const updateData: any = {};

    // Handle status updates
    if (data.action) {
      const actionToStatus: Record<string, string> = {
        markPaid: "PAID",
        markPartiallyPaid: "PARTIALLY_PAID",
        markOverdue: "OVERDUE",
        markDisputed: "DISPUTED",
        cancel: "CANCELLED",
      };
      const targetStatus = actionToStatus[data.action];
      if (targetStatus) {
        const allowedTransitions = VALID_INVOICE_TRANSITIONS[invoice.status];
        if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
          return NextResponse.json(
            { error: `Cannot transition invoice from ${invoice.status} to ${targetStatus}` },
            { status: 400 }
          );
        }
      }

      switch (data.action) {
        case "markPaid":
          updateData.status = "PAID";
          updateData.paidAt = new Date();
          updateData.paidAmount = invoice.total;
          if (data.paymentMethod) {
            updateData.paymentMethod = data.paymentMethod;
          }
          if (data.paymentReference) {
            updateData.paymentReference = data.paymentReference;
          }
          break;

        case "markPartiallyPaid":
          if (!data.paidAmount) {
            return NextResponse.json(
              { error: "paidAmount is required for partial payment" },
              { status: 400 }
            );
          }
          updateData.status = "PARTIALLY_PAID";
          updateData.paidAmount = data.paidAmount;
          if (data.paymentMethod) {
            updateData.paymentMethod = data.paymentMethod;
          }
          if (data.paymentReference) {
            updateData.paymentReference = data.paymentReference;
          }
          break;

        case "markOverdue":
          updateData.status = "OVERDUE";
          break;

        case "markDisputed":
          updateData.status = "DISPUTED";
          break;

        case "cancel":
          updateData.status = "CANCELLED";
          break;
      }
    }

    // Handle direct field updates
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedInvoice,
        subtotal: Number(updatedInvoice.subtotal),
        tax: Number(updatedInvoice.tax),
        total: Number(updatedInvoice.total),
        paidAmount: updatedInvoice.paidAmount
          ? Number(updatedInvoice.paidAmount)
          : null,
      },
    });
  } catch (error: any) {
    console.error("Update invoice error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
