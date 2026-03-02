import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getSupplierJobTier, hasTier, type PlanTier } from "@/lib/tier";

export const supplierCustomerHealth = inngest.createFunction(
  { id: "supplier-customer-health", name: "Supplier Customer Health Scoring" },
  { cron: "0 6 * * 1" }, // Monday 6 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true, planTier: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        if (!hasTier(supplier.planTier as PlanTier, getSupplierJobTier("supplier-customer-health"))) continue;

        const relationships = await prisma.restaurantSupplier.findMany({
          where: { supplierId: supplier.id },
          include: {
            restaurant: { select: { id: true, name: true } },
          },
        });

        if (relationships.length === 0) continue;

        const now = new Date();
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

        const customerScores: any[] = [];

        for (const rel of relationships) {
          const restaurantId = rel.restaurant.id;

          // Recent orders (last 4 weeks) and previous period (4-8 weeks ago)
          const [recentOrders, previousOrders] = await Promise.all([
            prisma.order.findMany({
              where: {
                supplierId: supplier.id,
                restaurantId,
                createdAt: { gte: fourWeeksAgo },
                status: { not: "CANCELLED" },
              },
              select: { total: true, createdAt: true },
            }),
            prisma.order.findMany({
              where: {
                supplierId: supplier.id,
                restaurantId,
                createdAt: { gte: eightWeeksAgo, lt: fourWeeksAgo },
                status: { not: "CANCELLED" },
              },
              select: { total: true, createdAt: true },
            }),
          ]);

          // Order frequency score (0-25)
          const recentFreq = recentOrders.length;
          const prevFreq = previousOrders.length;
          let freqScore = 15; // baseline
          if (recentFreq > prevFreq) freqScore = 25;
          else if (recentFreq === prevFreq && recentFreq > 0) freqScore = 20;
          else if (recentFreq < prevFreq && recentFreq > 0) freqScore = 10;
          else if (recentFreq === 0 && prevFreq > 0) freqScore = 0;
          else if (recentFreq === 0 && prevFreq === 0) freqScore = 5;

          // Average order value trend (0-25)
          const recentAvg = recentOrders.length > 0
            ? recentOrders.reduce((s, o) => s + Number(o.total), 0) / recentOrders.length
            : 0;
          const prevAvg = previousOrders.length > 0
            ? previousOrders.reduce((s, o) => s + Number(o.total), 0) / previousOrders.length
            : 0;
          let aovScore = 15;
          if (prevAvg > 0 && recentAvg > 0) {
            const change = (recentAvg - prevAvg) / prevAvg;
            if (change > 0.1) aovScore = 25;
            else if (change > -0.1) aovScore = 20;
            else aovScore = 5;
          }

          // Invoice payment timeliness (0-25)
          const invoices = await prisma.invoice.findMany({
            where: {
              supplierId: supplier.id,
              restaurantId,
              createdAt: { gte: eightWeeksAgo },
            },
            select: { status: true, dueDate: true, paidAt: true },
          });

          let paymentScore = 20; // default good
          if (invoices.length > 0) {
            const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
            const paidOnTimeCount = invoices.filter(
              (i) => i.paidAt && i.paidAt <= i.dueDate
            ).length;
            const overdueRatio = overdueCount / invoices.length;
            if (overdueRatio > 0.5) paymentScore = 0;
            else if (overdueRatio > 0.2) paymentScore = 10;
            else if (paidOnTimeCount === invoices.length) paymentScore = 25;
          }

          // Recency score (0-25)
          const lastOrder = recentOrders[0] || previousOrders[0];
          let recencyScore = 0;
          if (lastOrder) {
            const daysSinceOrder = Math.floor(
              (now.getTime() - lastOrder.createdAt.getTime()) / (24 * 60 * 60 * 1000)
            );
            if (daysSinceOrder <= 7) recencyScore = 25;
            else if (daysSinceOrder <= 14) recencyScore = 20;
            else if (daysSinceOrder <= 21) recencyScore = 15;
            else if (daysSinceOrder <= 28) recencyScore = 10;
            else if (daysSinceOrder <= 42) recencyScore = 5;
          }

          const totalScore = freqScore + aovScore + paymentScore + recencyScore;
          const riskLevel = totalScore < 40 ? "high" : totalScore < 70 ? "medium" : "low";

          customerScores.push({
            restaurantId,
            name: rel.restaurant.name,
            score: totalScore,
            riskLevel,
            breakdown: { freqScore, aovScore, paymentScore, recencyScore },
            recentOrders: recentFreq,
            previousOrders: prevFreq,
          });
        }

        customerScores.sort((a, b) => a.score - b.score);

        const atRisk = customerScores.filter((c) => c.riskLevel === "high");
        const summary = atRisk.length > 0
          ? `${atRisk.length} of ${customerScores.length} customers are at risk of churning. Top at-risk: ${atRisk.slice(0, 3).map((c) => c.name).join(", ")}.`
          : `All ${customerScores.length} customers are in good health. No immediate churn risk detected.`;

        // Expire old health insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "CUSTOMER_HEALTH",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "CUSTOMER_HEALTH",
            title: "Weekly Customer Health Report",
            summary,
            data: { customers: customerScores },
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          },
        });

        // Notify supplier users about at-risk customers
        if (atRisk.length > 0) {
          const users = await prisma.user.findMany({
            where: { supplierId: supplier.id },
            select: { id: true },
          });
          for (const user of users) {
            await prisma.notification.create({
              data: {
                type: "SYSTEM",
                title: "At-risk customers detected",
                message: `${atRisk.length} customer${atRisk.length !== 1 ? "s" : ""} at risk of churning: ${atRisk.slice(0, 3).map((c) => c.name).join(", ")}${atRisk.length > 3 ? ` and ${atRisk.length - 3} more` : ""}.`,
                userId: user.id,
                metadata: {
                  actionUrl: "/supplier/customers",
                  action: "view_customers",
                },
              },
            });
          }
        }

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-customer-health] failed:", err);
      throw err;
    }
  }
);
