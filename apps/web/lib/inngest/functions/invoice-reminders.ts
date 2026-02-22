import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

function getMilestoneTitle(
  milestone: string,
  invoiceNumber: string
): string {
  switch (milestone) {
    case "upcoming_7d":
      return `Payment Due Soon: ${invoiceNumber}`;
    case "due_today":
      return `Payment Due Today: ${invoiceNumber}`;
    case "overdue_1d":
      return `Payment Overdue: ${invoiceNumber}`;
    case "overdue_7d":
      return `Payment Overdue 7 Days: ${invoiceNumber}`;
    default:
      return `Invoice Reminder: ${invoiceNumber}`;
  }
}

function getMilestoneMessage(
  milestone: string,
  invoiceNumber: string,
  supplierName: string,
  amount: number,
  dueDate: string
): string {
  switch (milestone) {
    case "upcoming_7d":
      return `Invoice ${invoiceNumber} from ${supplierName} for $${amount.toFixed(2)} is due on ${dueDate}. Plan your payment.`;
    case "due_today":
      return `Invoice ${invoiceNumber} from ${supplierName} for $${amount.toFixed(2)} is due today. Please arrange payment.`;
    case "overdue_1d":
      return `Invoice ${invoiceNumber} from ${supplierName} for $${amount.toFixed(2)} is now overdue. Payment was due ${dueDate}.`;
    case "overdue_7d":
      return `Invoice ${invoiceNumber} from ${supplierName} for $${amount.toFixed(2)} is 7 days overdue. Immediate payment required.`;
    default:
      return `Reminder about invoice ${invoiceNumber} from ${supplierName} for $${amount.toFixed(2)}.`;
  }
}

export const invoiceReminders = inngest.createFunction(
  { id: "invoice-reminders", name: "Invoice Payment Reminders" },
  { cron: "0 8 * * *" }, // Daily 8 AM
  async () => {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
      },
      include: {
        supplier: { select: { name: true } },
        restaurant: { select: { id: true } },
      },
    });

    let notificationsSent = 0;
    let emailsSent = 0;
    let statusUpdates = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let milestone: string | null = null;

      if (diffDays === 7) milestone = "upcoming_7d";
      else if (diffDays === 0) milestone = "due_today";
      else if (diffDays === -1) milestone = "overdue_1d";
      else if (diffDays === -7) milestone = "overdue_7d";

      if (!milestone) continue;

      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: invoice.restaurant.id, role: "OWNER" },
      });

      if (!ownerUser) continue;

      const amount = Number(invoice.total);
      const dueDateStr = invoice.dueDate.toISOString().split("T")[0];
      const title = getMilestoneTitle(milestone, invoice.invoiceNumber);

      // Idempotency: check if notification already sent
      const existing = await prisma.notification.findFirst({
        where: {
          userId: ownerUser.id,
          title,
        },
      });

      if (existing) continue;

      // Determine notification type
      const notificationType =
        milestone === "overdue_1d" || milestone === "overdue_7d"
          ? "SYSTEM"
          : "ORDER_UPDATE";

      await prisma.notification.create({
        data: {
          type: notificationType as any,
          title,
          message: getMilestoneMessage(
            milestone,
            invoice.invoiceNumber,
            invoice.supplier.name,
            amount,
            dueDateStr
          ),
          userId: ownerUser.id,
          metadata: {
            invoiceId: invoice.id,
            milestone,
            action: "view_invoices",
            actionUrl: "/invoices",
          },
        },
      });
      notificationsSent++;

      // Send email for due_today
      if (milestone === "due_today" && ownerUser.email) {
        const template = emailTemplates.invoiceReminder(
          invoice.invoiceNumber,
          invoice.supplier.name,
          amount,
          dueDateStr,
          "Due Today"
        );
        await sendEmail({
          to: ownerUser.email,
          subject: template.subject,
          html: template.html,
        });
        emailsSent++;
      }

      // Send overdue email and update status
      if (
        (milestone === "overdue_1d" || milestone === "overdue_7d") &&
        ownerUser.email
      ) {
        const daysPastDue = Math.abs(diffDays);
        const template = emailTemplates.invoiceOverdue(
          invoice.invoiceNumber,
          invoice.supplier.name,
          amount,
          daysPastDue
        );
        await sendEmail({
          to: ownerUser.email,
          subject: template.subject,
          html: template.html,
        });
        emailsSent++;
      }

      // Update status to OVERDUE at T+1
      if (milestone === "overdue_1d" && invoice.status === "PENDING") {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "OVERDUE" },
        });
        statusUpdates++;
      }
    }

    return {
      invoicesChecked: invoices.length,
      notificationsSent,
      emailsSent,
      statusUpdates,
    };
  }
);
