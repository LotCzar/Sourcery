import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export const supplierPaymentCollection = inngest.createFunction(
  { id: "supplier-payment-collection", name: "Supplier Payment Collection Workflow" },
  { cron: "0 10 * * *" }, // Daily 10 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        // Get overdue invoices
        const overdueInvoices = await prisma.invoice.findMany({
          where: {
            supplierId: supplier.id,
            status: { in: ["PENDING", "OVERDUE", "PARTIALLY_PAID"] },
            dueDate: { lt: new Date() },
          },
          include: {
            restaurant: { select: { id: true, name: true, email: true } },
          },
          orderBy: { dueDate: "asc" },
        });

        if (overdueInvoices.length === 0) continue;

        // Check existing collection tracking in latest insight
        const existingInsight = await prisma.supplierInsight.findFirst({
          where: {
            supplierId: supplier.id,
            type: "PAYMENT_COLLECTION",
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
        });

        const existingTiers: Record<string, number> =
          (existingInsight?.data as any)?.tierTracking || {};

        const now = new Date();
        const actions: any[] = [];
        const tierTracking: Record<string, number> = {};

        for (const invoice of overdueInvoices) {
          const daysOverdue = Math.floor(
            (now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000)
          );

          const previousTier = existingTiers[invoice.id] || 0;
          let currentTier = 0;

          if (daysOverdue >= 30) currentTier = 4;
          else if (daysOverdue >= 14) currentTier = 3;
          else if (daysOverdue >= 7) currentTier = 2;
          else if (daysOverdue >= 3) currentTier = 1;

          tierTracking[invoice.id] = currentTier;

          // Only take action if tier has advanced since last run
          if (currentTier <= previousTier) continue;

          const amount = Number(invoice.total);
          const paidAmount = invoice.paidAmount ? Number(invoice.paidAmount) : 0;
          const outstanding = amount - paidAmount;

          let action = "";
          let priority = "normal";

          switch (currentTier) {
            case 1:
              action = "friendly_reminder";
              if (invoice.restaurant.email) {
                const template = emailTemplates.invoiceReminder(
                  invoice.invoiceNumber,
                  supplier.name,
                  outstanding,
                  invoice.dueDate.toISOString().split("T")[0],
                  "Payment Reminder"
                );
                try {
                  await sendEmail({
                    to: invoice.restaurant.email,
                    subject: template.subject,
                    html: template.html,
                  });
                } catch {
                  // Email send failed, continue
                }
              }
              break;
            case 2:
              action = "formal_notice";
              if (invoice.restaurant.email) {
                const template = emailTemplates.invoiceReminder(
                  invoice.invoiceNumber,
                  supplier.name,
                  outstanding,
                  invoice.dueDate.toISOString().split("T")[0],
                  "Overdue Notice"
                );
                try {
                  await sendEmail({
                    to: invoice.restaurant.email,
                    subject: template.subject,
                    html: template.html,
                  });
                } catch {
                  // Email send failed, continue
                }
              }
              break;
            case 3:
              action = "account_hold_warning";
              priority = "high";
              break;
            case 4:
              action = "manual_review";
              priority = "urgent";
              break;
          }

          actions.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customer: invoice.restaurant.name,
            customerId: invoice.restaurant.id,
            daysOverdue,
            outstanding: Math.round(outstanding * 100) / 100,
            tier: currentTier,
            action,
            priority,
          });
        }

        const totalOutstanding = overdueInvoices.reduce(
          (sum, inv) => sum + Number(inv.total) - (inv.paidAmount ? Number(inv.paidAmount) : 0),
          0
        );

        const summary = `Payment collection: ${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? "s" : ""} overdue ($${Math.round(totalOutstanding).toLocaleString()} outstanding).${actions.length > 0 ? ` ${actions.length} new escalation${actions.length !== 1 ? "s" : ""} triggered.` : " No new escalations."}${actions.filter((a) => a.priority === "urgent").length > 0 ? ` ${actions.filter((a) => a.priority === "urgent").length} require manual review.` : ""}`;

        // Expire old insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "PAYMENT_COLLECTION",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "PAYMENT_COLLECTION",
            title: "Payment Collection Status",
            summary,
            data: {
              totalOverdue: overdueInvoices.length,
              totalOutstanding: Math.round(totalOutstanding * 100) / 100,
              actions,
              tierTracking,
            },
            expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
          },
        });

        // Notify
        const users = await prisma.user.findMany({
          where: { supplierId: supplier.id },
          select: { id: true },
        });
        for (const user of users) {
          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Payment Collection Update",
              message: `Payment collection: ${overdueInvoices.length} invoices require attention ($${Math.round(totalOutstanding)} outstanding)`,
              userId: user.id,
              metadata: {
                actionUrl: "/supplier/invoices",
                action: "view_invoices",
              },
            },
          });
        }

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-payment-collection] failed:", err);
      throw err;
    }
  }
);
