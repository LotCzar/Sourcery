import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { trackAiUsage } from "@/lib/ai/usage";

export const supplierChurnWarning = inngest.createFunction(
  { id: "supplier-churn-warning", name: "Supplier Churn Early Warning" },
  { cron: "0 7 * * 1" }, // Monday 7 AM (after customer health at 6 AM)
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        // Read latest CUSTOMER_HEALTH insight
        const healthInsight = await prisma.supplierInsight.findFirst({
          where: {
            supplierId: supplier.id,
            type: "CUSTOMER_HEALTH",
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
        });

        if (!healthInsight) continue;

        const healthData = healthInsight.data as any;
        const customers = healthData?.customers || [];

        // Focus on customers scored < 50
        const atRiskCustomers = customers.filter((c: any) => c.score < 50);
        if (atRiskCustomers.length === 0) continue;

        const now = new Date();
        const churnAnalysis: any[] = [];

        for (const customer of atRiskCustomers) {
          // Get last 6 weeks of order data for deeper analysis
          const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
          const orders = await prisma.order.findMany({
            where: {
              supplierId: supplier.id,
              restaurantId: customer.restaurantId,
              status: { not: "CANCELLED" },
              createdAt: { gte: sixWeeksAgo },
            },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          });

          // Check for 3+ consecutive weeks of declining frequency
          const weeklyOrders: number[] = [0, 0, 0, 0, 0, 0];
          const weeklyRevenue: number[] = [0, 0, 0, 0, 0, 0];
          for (const order of orders) {
            const weekIdx = Math.min(
              5,
              Math.floor((now.getTime() - order.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
            );
            weeklyOrders[weekIdx]++;
            weeklyRevenue[weekIdx] += Number(order.total);
          }

          // Check frequency decline for 3+ consecutive weeks
          let consecutiveDeclines = 0;
          for (let i = 0; i < weeklyOrders.length - 1; i++) {
            if (weeklyOrders[i] < weeklyOrders[i + 1]) {
              consecutiveDeclines++;
            } else {
              break;
            }
          }
          const frequencyDeclining = consecutiveDeclines >= 3;

          // Check basket size shrinking > 20%
          const recentBasket = weeklyOrders[0] > 0 ? weeklyRevenue[0] / weeklyOrders[0] : 0;
          const previousBasket = weeklyOrders.slice(2, 5).reduce((s, v) => s + v, 0) > 0
            ? weeklyRevenue.slice(2, 5).reduce((s, v) => s + v, 0) /
              weeklyOrders.slice(2, 5).reduce((s, v) => s + v, 0)
            : 0;
          const basketShrinking =
            previousBasket > 0 && recentBasket > 0
              ? (previousBasket - recentBasket) / previousBasket > 0.2
              : false;

          // Gap since last order vs normal frequency
          const lastOrderDate = orders[0]?.createdAt;
          const avgGapDays = orders.length > 1
            ? (orders[0].createdAt.getTime() - orders[orders.length - 1].createdAt.getTime()) /
              (orders.length - 1) /
              (24 * 60 * 60 * 1000)
            : 7;
          const daysSinceLastOrder = lastOrderDate
            ? (now.getTime() - lastOrderDate.getTime()) / (24 * 60 * 60 * 1000)
            : Infinity;
          const longGap = daysSinceLastOrder > avgGapDays * 2;

          // Calculate churn probability
          const signals = [frequencyDeclining, basketShrinking, longGap].filter(Boolean).length;
          const churnRisk = signals >= 2 ? "high" : "medium";

          churnAnalysis.push({
            restaurantId: customer.restaurantId,
            name: customer.name,
            healthScore: customer.score,
            churnRisk,
            signals: {
              frequencyDeclining,
              consecutiveDeclines,
              basketShrinking,
              basketChange: previousBasket > 0
                ? Math.round(((recentBasket - previousBasket) / previousBasket) * 100)
                : null,
              longGap,
              daysSinceLastOrder: Math.round(daysSinceLastOrder),
              normalGapDays: Math.round(avgGapDays),
            },
            weeklyOrders,
            weeklyRevenue: weeklyRevenue.map((v) => Math.round(v * 100) / 100),
          });
        }

        const highRisk = churnAnalysis.filter((c) => c.churnRisk === "high");

        // AI summary with re-engagement suggestions
        let summary: string;
        const anthropic = getAnthropicClient();

        if (anthropic && highRisk.length > 0) {
          try {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: `You are a customer success AI for ${supplier.name}. Write a 3-5 sentence churn warning with personalized re-engagement suggestions.

High-risk customers:
${highRisk.slice(0, 5).map((c) => `- ${c.name}: score ${c.healthScore}, ${c.signals.daysSinceLastOrder} days since last order, ${c.signals.frequencyDeclining ? "declining frequency" : ""}${c.signals.basketShrinking ? ", shrinking basket" : ""}${c.signals.longGap ? ", long ordering gap" : ""}`).join("\n")}

Medium-risk: ${churnAnalysis.filter((c) => c.churnRisk === "medium").length}

Suggest specific re-engagement actions per customer. Be concise and actionable.`,
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
            summary = textBlock?.text || `${highRisk.length} customers at high churn risk, ${churnAnalysis.length - highRisk.length} at medium risk.`;
          } catch {
            summary = `${highRisk.length} customers at high churn risk, ${churnAnalysis.length - highRisk.length} at medium risk.`;
          }
        } else {
          summary = `${highRisk.length} customers at high churn risk, ${churnAnalysis.length - highRisk.length} at medium risk.`;
        }

        // Expire old insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "CHURN_WARNING",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "CHURN_WARNING",
            title: "Churn Early Warning",
            summary,
            data: { customers: churnAnalysis },
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days
          },
        });

        // Only notify if high-risk customers found
        if (highRisk.length > 0) {
          const users = await prisma.user.findMany({
            where: { supplierId: supplier.id },
            select: { id: true },
          });
          for (const user of users) {
            await prisma.notification.create({
              data: {
                type: "SYSTEM",
                title: "Churn Risk Alert",
                message: `${highRisk.length} customer${highRisk.length !== 1 ? "s" : ""} at high churn risk — re-engagement actions recommended`,
                userId: user.id,
                metadata: {
                  actionUrl: "/supplier/insights",
                  action: "view_insights",
                },
              },
            });
          }
        }

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-churn-warning] failed:", err);
      throw err;
    }
  }
);
