import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { sendEmail, emailTemplates } from "@/lib/email";
import { trackAiUsage } from "@/lib/ai/usage";

export const supplierWeeklyDigest = inngest.createFunction(
  { id: "supplier-weekly-digest", name: "Supplier Weekly Digest" },
  { cron: "0 8 * * 1" }, // Monday 8 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let digestsSent = 0;

      for (const supplier of suppliers) {
        // Find admin user for this supplier
        const adminUser = await prisma.user.findFirst({
          where: { supplierId: supplier.id, role: "SUPPLIER_ADMIN" },
        });

        if (!adminUser?.email) continue;

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);

        // This week's orders
        const thisWeekOrders = await prisma.order.findMany({
          where: {
            supplierId: supplier.id,
            createdAt: { gte: weekStart },
            status: { not: "CANCELLED" },
          },
          select: { total: true, restaurantId: true },
        });

        const totalRevenue = thisWeekOrders.reduce(
          (sum, o) => sum + Number(o.total),
          0
        );
        const orderCount = thisWeekOrders.length;

        // New customers this week
        const newRelationships = await prisma.restaurantSupplier.count({
          where: {
            supplierId: supplier.id,
            createdAt: { gte: weekStart },
          },
        });

        // Outstanding and overdue invoices
        const [outstandingInvoices, overdueInvoices] = await Promise.all([
          prisma.invoice.count({
            where: {
              supplierId: supplier.id,
              status: { in: ["PENDING", "PARTIALLY_PAID"] },
            },
          }),
          prisma.invoice.count({
            where: {
              supplierId: supplier.id,
              status: "OVERDUE",
            },
          }),
        ]);

        const metrics = {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          orderCount,
          newCustomers: newRelationships,
          outstandingInvoices,
          overdueInvoices,
        };

        // Generate AI summary
        let aiSummary: string;
        const anthropic = getAnthropicClient();

        if (anthropic) {
          try {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 256,
              messages: [
                {
                  role: "user",
                  content: `You are a business AI for a food supplier. Write a 3-4 sentence weekly digest summary for ${supplier.name}.

Metrics:
- Revenue: $${metrics.totalRevenue.toFixed(2)} (${metrics.orderCount} orders)
- New customers: ${metrics.newCustomers}
- Outstanding invoices: ${metrics.outstandingInvoices}
- Overdue invoices: ${metrics.overdueInvoices}

Be concise, highlight what needs attention, and suggest 1-2 actions.`,
                },
              ],
            });

            void trackAiUsage({
              feature: "SUPPLIER_DIGEST",
              supplierId: supplier.id,
              userId: null,
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              model: response.model,
            });

            const textBlock = response.content.find((b) => b.type === "text");
            aiSummary = textBlock?.text ||
              `This week: $${metrics.totalRevenue.toFixed(2)} revenue across ${metrics.orderCount} orders.`;
          } catch {
            aiSummary = `This week: $${metrics.totalRevenue.toFixed(2)} revenue across ${metrics.orderCount} orders.${metrics.overdueInvoices > 0 ? ` ${metrics.overdueInvoices} overdue invoices need attention.` : ""}`;
          }
        } else {
          aiSummary = `This week: $${metrics.totalRevenue.toFixed(2)} revenue across ${metrics.orderCount} orders.${metrics.overdueInvoices > 0 ? ` ${metrics.overdueInvoices} overdue invoices need attention.` : ""}`;
        }

        const template = emailTemplates.supplierWeeklyDigest(
          supplier.name,
          aiSummary,
          metrics
        );

        await sendEmail({
          to: adminUser.email,
          subject: template.subject,
          html: template.html,
        });

        digestsSent++;
      }

      return { suppliersProcessed: suppliers.length, digestsSent };
    } catch (err) {
      console.error("[supplier-weekly-digest] failed:", err);
      throw err;
    }
  }
);
