import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

async function notifySupplierUsers(supplierId: string, title: string, message: string) {
  const users = await prisma.user.findMany({
    where: { supplierId },
    select: { id: true },
  });
  for (const user of users) {
    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title,
        message,
        userId: user.id,
        metadata: {
          actionUrl: "/supplier/invoices",
          action: "view_invoices",
        },
      },
    });
  }
}

export const supplierInvoiceEscalation = inngest.createFunction(
  { id: "supplier-invoice-escalation", name: "Supplier Invoice Escalation" },
  { cron: "0 10 * * *" }, // Daily 10 AM
  async () => {
    try {
      const now = new Date();

      // Find all overdue invoices
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: { in: ["PENDING", "OVERDUE"] },
          dueDate: { lt: now },
        },
        include: {
          supplier: { select: { id: true, name: true } },
          restaurant: { select: { id: true, name: true, email: true } },
          order: { select: { orderNumber: true } },
        },
      });

      let reminders = 0;
      let overdueNotices = 0;
      let escalations = 0;

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (!invoice.restaurant.email) continue;

        // Check if we already sent a reminder at this tier
        const existingEscalation = await prisma.supplierInsight.findFirst({
          where: {
            supplierId: invoice.supplierId,
            type: "ESCALATION",
            data: {
              path: ["invoiceId"],
              equals: invoice.id,
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const lastTier = (existingEscalation?.data as any)?.tier || 0;

        if (daysOverdue >= 30 && lastTier < 3) {
          // Tier 3: Manual review escalation
          await prisma.supplierInsight.create({
            data: {
              supplierId: invoice.supplierId,
              type: "ESCALATION",
              title: `Invoice ${invoice.invoiceNumber} - 30+ days overdue`,
              summary: `Invoice ${invoice.invoiceNumber} from ${invoice.restaurant.name} is ${daysOverdue} days overdue ($${Number(invoice.total).toFixed(2)}). Requires manual review and direct outreach.`,
              data: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                restaurantName: invoice.restaurant.name,
                restaurantId: invoice.restaurant.id,
                amount: Number(invoice.total),
                daysOverdue,
                tier: 3,
              },
            },
          });

          // Also mark invoice as OVERDUE if still PENDING
          if (invoice.status === "PENDING") {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: "OVERDUE" },
            });
          }

          await notifySupplierUsers(
            invoice.supplierId,
            `Invoice ${invoice.invoiceNumber} requires manual review`,
            `Invoice for ${invoice.restaurant.name} is ${daysOverdue} days overdue ($${Number(invoice.total).toFixed(2)}). Direct outreach recommended.`
          );

          escalations++;
        } else if (daysOverdue >= 14 && lastTier < 2) {
          // Tier 2: Overdue notice
          const template = emailTemplates.invoiceOverdue(
            invoice.invoiceNumber,
            invoice.supplier.name,
            Number(invoice.total),
            daysOverdue
          );

          await sendEmail({
            to: invoice.restaurant.email,
            subject: template.subject,
            html: template.html,
          });

          // Track
          await prisma.supplierInsight.create({
            data: {
              supplierId: invoice.supplierId,
              type: "ESCALATION",
              title: `Overdue notice sent: ${invoice.invoiceNumber}`,
              summary: `Overdue notice sent to ${invoice.restaurant.name} for invoice ${invoice.invoiceNumber} ($${Number(invoice.total).toFixed(2)}, ${daysOverdue} days overdue).`,
              status: "ACTED_ON",
              data: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                restaurantName: invoice.restaurant.name,
                amount: Number(invoice.total),
                daysOverdue,
                tier: 2,
              },
            },
          });

          // Mark as OVERDUE
          if (invoice.status === "PENDING") {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: "OVERDUE" },
            });
          }

          await notifySupplierUsers(
            invoice.supplierId,
            `Overdue notice sent: ${invoice.invoiceNumber}`,
            `Overdue notice sent to ${invoice.restaurant.name} for $${Number(invoice.total).toFixed(2)} (${daysOverdue} days overdue).`
          );

          overdueNotices++;
        } else if (daysOverdue >= 7 && lastTier < 1) {
          // Tier 1: Reminder
          const template = emailTemplates.invoiceReminder(
            invoice.invoiceNumber,
            invoice.supplier.name,
            Number(invoice.total),
            invoice.dueDate.toLocaleDateString(),
            "Reminder"
          );

          await sendEmail({
            to: invoice.restaurant.email,
            subject: template.subject,
            html: template.html,
          });

          // Track
          await prisma.supplierInsight.create({
            data: {
              supplierId: invoice.supplierId,
              type: "ESCALATION",
              title: `Reminder sent: ${invoice.invoiceNumber}`,
              summary: `Payment reminder sent to ${invoice.restaurant.name} for invoice ${invoice.invoiceNumber} ($${Number(invoice.total).toFixed(2)}, ${daysOverdue} days overdue).`,
              status: "ACTED_ON",
              data: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                restaurantName: invoice.restaurant.name,
                amount: Number(invoice.total),
                daysOverdue,
                tier: 1,
              },
            },
          });

          await notifySupplierUsers(
            invoice.supplierId,
            `Payment reminder sent: ${invoice.invoiceNumber}`,
            `Reminder sent to ${invoice.restaurant.name} for $${Number(invoice.total).toFixed(2)} (${daysOverdue} days overdue).`
          );

          reminders++;
        }
      }

      return {
        invoicesProcessed: overdueInvoices.length,
        reminders,
        overdueNotices,
        escalations,
      };
    } catch (err) {
      console.error("[supplier-invoice-escalation] failed:", err);
      throw err;
    }
  }
);
