import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List invoices for supplier
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {
      supplierId: user.supplier.id,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { restaurant: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
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

    // Calculate stats
    const stats = await prisma.invoice.groupBy({
      by: ["status"],
      where: { supplierId: user.supplier.id },
      _sum: { total: true },
      _count: true,
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidThisMonth = await prisma.invoice.aggregate({
      where: {
        supplierId: user.supplier.id,
        status: "PAID",
        paidAt: { gte: startOfMonth },
      },
      _sum: { total: true },
      _count: true,
    });

    const overdueCount = await prisma.invoice.count({
      where: {
        supplierId: user.supplier.id,
        status: "PENDING",
        dueDate: { lt: now },
      },
    });

    const totalOutstanding = await prisma.invoice.aggregate({
      where: {
        supplierId: user.supplier.id,
        status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
      },
      _sum: { total: true },
    });

    return NextResponse.json({
      success: true,
      data: invoices.map((invoice) => ({
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
      })),
      stats: {
        totalOutstanding: totalOutstanding._sum.total
          ? Number(totalOutstanding._sum.total)
          : 0,
        pendingCount:
          stats.find((s) => s.status === "PENDING")?._count || 0,
        overdueCount,
        paidThisMonth: paidThisMonth._sum.total
          ? Number(paidThisMonth._sum.total)
          : 0,
        paidThisMonthCount: paidThisMonth._count || 0,
      },
    });
  } catch (error: any) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Create invoice (usually auto-generated when order is delivered)
export async function POST(request: Request) {
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

    const data = await request.json();

    // Validate required fields
    if (!data.orderId && (!data.restaurantId || !data.total)) {
      return NextResponse.json(
        { error: "Either orderId or (restaurantId and total) is required" },
        { status: 400 }
      );
    }

    let invoiceData: any;

    if (data.orderId) {
      // Create invoice from order
      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
        include: { restaurant: true },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      if (order.supplierId !== user.supplier.id) {
        return NextResponse.json(
          { error: "Order does not belong to this supplier" },
          { status: 403 }
        );
      }

      // Check if invoice already exists for this order
      const existingInvoice = await prisma.invoice.findUnique({
        where: { orderId: data.orderId },
      });

      if (existingInvoice) {
        return NextResponse.json(
          { error: "Invoice already exists for this order" },
          { status: 400 }
        );
      }

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count({
        where: { supplierId: user.supplier.id },
      });
      const invoiceNumber = `INV-${user.supplier.id.slice(-4).toUpperCase()}-${String(invoiceCount + 1).padStart(5, "0")}`;

      // Default due date is 30 days from now
      const dueDate = data.dueDate
        ? new Date(data.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      invoiceData = {
        invoiceNumber,
        supplierId: user.supplier.id,
        restaurantId: order.restaurantId,
        orderId: order.id,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        dueDate,
        notes: data.notes || null,
      };
    } else {
      // Create manual invoice
      const invoiceCount = await prisma.invoice.count({
        where: { supplierId: user.supplier.id },
      });
      const invoiceNumber = `INV-${user.supplier.id.slice(-4).toUpperCase()}-${String(invoiceCount + 1).padStart(5, "0")}`;

      const dueDate = data.dueDate
        ? new Date(data.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const subtotal = parseFloat(data.subtotal || data.total);
      const tax = parseFloat(data.tax || "0");
      const total = parseFloat(data.total);

      invoiceData = {
        invoiceNumber,
        supplierId: user.supplier.id,
        restaurantId: data.restaurantId,
        subtotal,
        tax,
        total,
        dueDate,
        notes: data.notes || null,
      };
    }

    const invoice = await prisma.invoice.create({
      data: invoiceData,
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
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
      },
    });
  } catch (error: any) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice", details: error?.message },
      { status: 500 }
    );
  }
}
