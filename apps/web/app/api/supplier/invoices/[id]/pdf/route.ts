import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, supplierId: user.supplier.id },
      include: {
        restaurant: true,
        order: {
          include: {
            items: {
              include: {
                product: { select: { name: true, unit: true } },
              },
            },
          },
        },
        supplier: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const formatCurrency = (val: any) =>
      `$${Number(val).toFixed(2)}`;

    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

    const statusLabel =
      invoice.status === "PAID"
        ? '<span style="color: #16a34a; font-weight: bold;">PAID</span>'
        : invoice.status === "OVERDUE"
          ? '<span style="color: #dc2626; font-weight: bold;">OVERDUE</span>'
          : `<span style="font-weight: bold;">${invoice.status}</span>`;

    const itemsHtml = invoice.order?.items
      ? invoice.order.items
          .map(
            (item) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.product.name)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${Number(item.quantity)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.product.unit.toLowerCase()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.subtotal)}</td>
          </tr>`
          )
          .join("")
      : '<tr><td colspan="5" style="padding: 8px; text-align: center; color: #6b7280;">No line items available</td></tr>';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 20px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
      Print / Save as PDF
    </button>
  </div>

  <!-- Supplier Letterhead -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
    <div>
      <h1 style="margin: 0; font-size: 28px; color: #111827;">${escapeHtml(invoice.supplier.name)}</h1>
      ${invoice.supplier.address ? `<p style="margin: 4px 0 0; color: #6b7280;">${escapeHtml(invoice.supplier.address)}</p>` : ""}
      ${invoice.supplier.city ? `<p style="margin: 2px 0 0; color: #6b7280;">${escapeHtml(invoice.supplier.city)}${invoice.supplier.state ? `, ${escapeHtml(invoice.supplier.state)}` : ""} ${invoice.supplier.zipCode || ""}</p>` : ""}
      ${invoice.supplier.email ? `<p style="margin: 2px 0 0; color: #6b7280;">${escapeHtml(invoice.supplier.email)}</p>` : ""}
      ${invoice.supplier.phone ? `<p style="margin: 2px 0 0; color: #6b7280;">${escapeHtml(invoice.supplier.phone)}</p>` : ""}
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 24px; color: #6b7280;">INVOICE</h2>
      <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${escapeHtml(invoice.invoiceNumber)}</p>
      <p style="margin: 4px 0 0;">${statusLabel}</p>
    </div>
  </div>

  <!-- Bill To + Dates -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div>
      <h3 style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Bill To</h3>
      <p style="margin: 0; font-weight: bold;">${escapeHtml(invoice.restaurant.name)}</p>
      ${invoice.restaurant.address ? `<p style="margin: 2px 0 0; color: #4b5563;">${escapeHtml(invoice.restaurant.address)}</p>` : ""}
      ${invoice.restaurant.city ? `<p style="margin: 2px 0 0; color: #4b5563;">${escapeHtml(invoice.restaurant.city)}${invoice.restaurant.state ? `, ${escapeHtml(invoice.restaurant.state)}` : ""} ${invoice.restaurant.zipCode || ""}</p>` : ""}
    </div>
    <div style="text-align: right;">
      <div style="margin-bottom: 8px;">
        <span style="color: #6b7280;">Issue Date:</span>
        <span style="margin-left: 8px; font-weight: 500;">${formatDate(invoice.issueDate)}</span>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="color: #6b7280;">Due Date:</span>
        <span style="margin-left: 8px; font-weight: 500; ${invoice.status !== "PAID" && new Date(invoice.dueDate) < new Date() ? "color: #dc2626;" : ""}">${formatDate(invoice.dueDate)}</span>
      </div>
      ${invoice.order ? `<div><span style="color: #6b7280;">Order:</span><span style="margin-left: 8px;">${escapeHtml(invoice.order.orderNumber)}</span></div>` : ""}
    </div>
  </div>

  <!-- Line Items -->
  <table style="margin-bottom: 24px;">
    <thead>
      <tr style="background: #f9fafb;">
        <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Item</th>
        <th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Qty</th>
        <th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Unit</th>
        <th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Unit Price</th>
        <th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="display: flex; justify-content: flex-end;">
    <div style="width: 280px;">
      <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #4b5563;">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #4b5563;">
        <span>Tax</span>
        <span>${formatCurrency(invoice.tax)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #111827; font-size: 18px; font-weight: bold;">
        <span>Total</span>
        <span>${formatCurrency(invoice.total)}</span>
      </div>
      ${invoice.paidAmount ? `<div style="display: flex; justify-content: space-between; padding: 6px 0; color: #16a34a;"><span>Paid</span><span>${formatCurrency(invoice.paidAmount)}</span></div>` : ""}
    </div>
  </div>

  ${invoice.notes ? `<div style="margin-top: 30px; padding: 16px; background: #f9fafb; border-radius: 8px;"><h3 style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Notes</h3><p style="margin: 0;">${escapeHtml(invoice.notes)}</p></div>` : ""}

  <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>Generated by FreshSheet</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error: any) {
    console.error("Invoice PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
