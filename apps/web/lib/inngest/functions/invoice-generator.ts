import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export const invoiceGenerator = inngest.createFunction(
  { id: "invoice-generator", name: "Generate Invoice on Delivery" },
  { event: "order/delivered" },
  async ({ event }) => {
    const { orderId, restaurantId } = event.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return { action: "skipped", reason: "order_not_found" };
    }

    // Check for existing invoice (idempotency)
    const existingInvoice = await prisma.invoice.findUnique({
      where: { orderId },
    });
    if (existingInvoice) {
      return { action: "skipped", reason: "invoice_exists" };
    }

    // Find the restaurant owner
    const ownerUser = await prisma.user.findFirst({
      where: { restaurantId, role: "OWNER" },
    });

    // Generate invoice number
    const invoiceCount = await prisma.invoice.count({
      where: { restaurantId },
    });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, "0")}`;

    // Create invoice with 30-day payment terms
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        restaurantId,
        supplierId: order.supplierId,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        dueDate,
        status: "PENDING",
        notes: `Auto-generated from delivered order ${order.orderNumber}`,
      },
    });

    // Notify restaurant owner
    if (ownerUser) {
      await prisma.notification.create({
        data: {
          type: "ORDER_UPDATE",
          title: "Invoice Generated",
          message: `Invoice ${invoiceNumber} ($${Number(order.total).toFixed(2)}) generated for order ${order.orderNumber}. Payment due by ${dueDate.toLocaleDateString()}.`,
          userId: ownerUser.id,
          metadata: { invoiceId: invoice.id, orderId: order.id },
        },
      });

      // Send email
      if (ownerUser.email) {
        const template = emailTemplates.orderDelivered(
          order.orderNumber,
          invoiceNumber,
          Number(order.total)
        );
        await sendEmail({
          to: ownerUser.email,
          subject: template.subject,
          html: template.html,
        });
      }
    }

    return {
      action: "invoice_created",
      invoiceId: invoice.id,
      invoiceNumber,
    };
  }
);
