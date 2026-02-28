import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export const supplierCustomerFollowup = inngest.createFunction(
  { id: "supplier-customer-followup", name: "Supplier Customer Follow-ups" },
  { cron: "0 9 * * *" }, // Daily 9 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let followupsSent = 0;

      for (const supplier of suppliers) {
        const relationships = await prisma.restaurantSupplier.findMany({
          where: { supplierId: supplier.id },
          include: {
            restaurant: { select: { id: true, name: true, email: true } },
          },
        });

        for (const rel of relationships) {
          if (!rel.restaurant.email) continue;

          // Check if already followed up in last 14 days
          const recentFollowup = await prisma.supplierInsight.findFirst({
            where: {
              supplierId: supplier.id,
              type: "CUSTOMER_HEALTH",
              data: {
                path: ["lastFollowup", rel.restaurant.id],
                not: undefined as any,
              },
              createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
            },
          });

          // Alternative: check for recent followup insight
          const recentFollowupInsight = await prisma.supplierInsight.findFirst({
            where: {
              supplierId: supplier.id,
              type: "ANOMALY",
              title: { contains: "Follow-up sent" },
              summary: { contains: rel.restaurant.name },
              createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
            },
          });

          if (recentFollowup || recentFollowupInsight) continue;

          // Check last order date
          const lastOrder = await prisma.order.findFirst({
            where: {
              supplierId: supplier.id,
              restaurantId: rel.restaurant.id,
              status: { not: "CANCELLED" },
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });

          if (!lastOrder) continue;

          const daysSinceLastOrder = Math.floor(
            (Date.now() - lastOrder.createdAt.getTime()) / (24 * 60 * 60 * 1000)
          );

          // Check for recent order issues
          const recentIssues = await prisma.order.count({
            where: {
              supplierId: supplier.id,
              restaurantId: rel.restaurant.id,
              status: { in: ["CANCELLED", "RETURNED"] },
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          });

          // Check customer health score
          const healthInsight = await prisma.supplierInsight.findFirst({
            where: {
              supplierId: supplier.id,
              type: "CUSTOMER_HEALTH",
              status: "ACTIVE",
            },
            orderBy: { createdAt: "desc" },
          });

          const healthData = healthInsight?.data as any;
          const customerHealth = healthData?.customers?.find(
            (c: any) => c.restaurantId === rel.restaurant.id
          );
          const healthScore = customerHealth?.score ?? 100;

          // Determine if follow-up is needed
          let shouldFollowUp = false;
          let reason = "";

          if (daysSinceLastOrder > 14 && healthScore < 70) {
            shouldFollowUp = true;
            reason = `It's been ${daysSinceLastOrder} days since your last order`;
          } else if (healthScore < 40) {
            shouldFollowUp = true;
            reason = "We'd love to help with your sourcing needs";
          } else if (recentIssues > 0 && daysSinceLastOrder > 7) {
            shouldFollowUp = true;
            reason = "We want to make sure everything is going well with your orders";
          }

          if (!shouldFollowUp) continue;

          const message = `We noticed ${reason}. We value our partnership and want to ensure you have everything you need. Please don't hesitate to reach out if there's anything we can help with, or visit your FreshSheet dashboard to place a new order.`;

          const template = emailTemplates.supplierCustomerFollowup(
            rel.restaurant.name,
            supplier.name,
            message
          );

          await sendEmail({
            to: rel.restaurant.email,
            subject: template.subject,
            html: template.html,
          });

          followupsSent++;
        }
      }

      return { suppliersProcessed: suppliers.length, followupsSent };
    } catch (err) {
      console.error("[supplier-customer-followup] failed:", err);
      throw err;
    }
  }
);
