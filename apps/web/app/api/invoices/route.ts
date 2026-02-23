import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreateInvoiceSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// GET all invoices for user's restaurant
export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");

    const where: any = {
      restaurantId: user.restaurant.id,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (supplierId && supplierId !== "all") {
      where.supplierId = supplierId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, email: true },
        },
        order: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Calculate summary stats using aggregate queries
    const restaurantId = user.restaurant.id;
    const [totalPendingResult, totalPaidResult, overdueCount, totalInvoiceCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { restaurantId, status: { in: ["PENDING", "OVERDUE"] } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { restaurantId, status: "PAID" },
        _sum: { total: true },
      }),
      prisma.invoice.count({
        where: { restaurantId, status: "OVERDUE" },
      }),
      prisma.invoice.count({
        where: { restaurantId },
      }),
    ]);

    const totalPending = totalPendingResult._sum.total ? Number(totalPendingResult._sum.total) : 0;
    const totalPaid = totalPaidResult._sum.total ? Number(totalPaidResult._sum.total) : 0;

    // Format invoices
    const formattedInvoices = invoices.map((invoice) => ({
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
      order: invoice.order,
      createdAt: invoice.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedInvoices,
      summary: {
        totalPending,
        totalPaid,
        overdueCount,
        totalInvoices: totalInvoiceCount,
      },
    });
  } catch (error: any) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST create new invoice
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const validation = validateBody(CreateInvoiceSchema, body);
    if (!validation.success) return validation.response;

    const {
      invoiceNumber,
      supplierId,
      orderId,
      subtotal,
      tax,
      dueDate,
      notes,
      fileUrl,
    } = validation.data;

    // Verify supplier exists and belongs to this restaurant
    const restaurantSupplier = await prisma.restaurantSupplier.findFirst({
      where: {
        restaurantId: user.restaurant.id,
        supplierId,
      },
      include: { supplier: true },
    });

    if (!restaurantSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Check if order exists and belongs to restaurant (if provided)
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          restaurantId: user.restaurant.id,
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Check if order already has an invoice
      const existingInvoice = await prisma.invoice.findUnique({
        where: { orderId },
      });

      if (existingInvoice) {
        return NextResponse.json(
          { error: "Order already has an invoice" },
          { status: 400 }
        );
      }
    }

    const total = Number(subtotal) + Number(tax);

    // Determine initial status based on due date
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    const status = dueDateObj < now ? "OVERDUE" : "PENDING";

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        restaurantId: user.restaurant.id,
        supplierId,
        orderId: orderId || null,
        subtotal,
        tax,
        total,
        dueDate: dueDateObj,
        status,
        notes,
        fileUrl,
      },
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
        dueDate: invoice.dueDate,
        supplier: invoice.supplier,
        order: invoice.order,
      },
    });
  } catch (error: any) {
    console.error("Invoice create error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
