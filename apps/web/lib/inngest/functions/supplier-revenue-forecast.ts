import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { trackAiUsage } from "@/lib/ai/usage";
import { getSupplierJobTier, hasTier, type PlanTier } from "@/lib/tier";

export const supplierRevenueForecast = inngest.createFunction(
  { id: "supplier-revenue-forecast", name: "Supplier Revenue Forecast" },
  { cron: "0 22 * * 0" }, // Sunday 10 PM (after demand forecast)
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true, planTier: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        if (!hasTier(supplier.planTier as PlanTier, getSupplierJobTier("supplier-revenue-forecast"))) continue;

        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

        // Get weekly revenue for last 12 weeks
        const orders = await prisma.order.findMany({
          where: {
            supplierId: supplier.id,
            status: { not: "CANCELLED" },
            createdAt: { gte: twelveWeeksAgo },
          },
          select: {
            total: true,
            createdAt: true,
            restaurantId: true,
            items: {
              select: {
                subtotal: true,
                product: { select: { category: true } },
              },
            },
          },
        });

        if (orders.length < 10) continue;

        // Group revenue by week number (0 = most recent)
        const weeklyRevenue: Record<number, number> = {};
        for (const order of orders) {
          const weekNum = Math.floor(
            (Date.now() - order.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          );
          weeklyRevenue[weekNum] = (weeklyRevenue[weekNum] || 0) + Number(order.total);
        }

        // Fill missing weeks with 0
        const weeks = Array.from({ length: 12 }, (_, i) => i);
        const revenueValues = weeks.map((w) => weeklyRevenue[w] || 0);

        // Linear regression for 4-week projection
        const n = revenueValues.length;
        const xMean = (n - 1) / 2;
        const yMean = revenueValues.reduce((s, v) => s + v, 0) / n;
        let num = 0;
        let den = 0;
        for (let i = 0; i < n; i++) {
          num += (i - xMean) * (revenueValues[i] - yMean);
          den += (i - xMean) ** 2;
        }
        const slope = den !== 0 ? num / den : 0;
        const intercept = yMean - slope * xMean;

        // Project next 4 weeks (weeks -1 to -4, i.e., future)
        const projections = Array.from({ length: 4 }, (_, i) => {
          const weekIdx = -(i + 1);
          return Math.max(0, Math.round((intercept + slope * weekIdx) * 100) / 100);
        });

        const projectedTotal = projections.reduce((s, v) => s + v, 0);
        const currentPeriodRevenue = revenueValues.slice(0, 4).reduce((s, v) => s + v, 0);
        const changePercent = currentPeriodRevenue > 0
          ? ((projectedTotal - currentPeriodRevenue) / currentPeriodRevenue) * 100
          : 0;

        // Top 5 customers by revenue
        const customerRevenue: Record<string, number> = {};
        for (const order of orders) {
          customerRevenue[order.restaurantId] =
            (customerRevenue[order.restaurantId] || 0) + Number(order.total);
        }
        const topCustomerIds = Object.entries(customerRevenue)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([id]) => id);

        const restaurants = await prisma.restaurant.findMany({
          where: { id: { in: topCustomerIds } },
          select: { id: true, name: true },
        });
        const nameMap = new Map(restaurants.map((r) => [r.id, r.name]));

        const topCustomers = topCustomerIds.map((id) => ({
          name: nameMap.get(id) || "Unknown",
          revenue: Math.round((customerRevenue[id] || 0) * 100) / 100,
        }));

        // Top 5 categories
        const categoryRevenue: Record<string, number> = {};
        for (const order of orders) {
          for (const item of order.items) {
            const cat = item.product.category;
            categoryRevenue[cat] = (categoryRevenue[cat] || 0) + Number(item.subtotal);
          }
        }
        const topCategories = Object.entries(categoryRevenue)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([category, revenue]) => ({
            category,
            revenue: Math.round(revenue * 100) / 100,
          }));

        // AI summary
        let summary: string;
        const anthropic = getAnthropicClient();

        if (anthropic) {
          try {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 512,
              messages: [
                {
                  role: "user",
                  content: `You are a business analytics AI. Write a 3-5 sentence revenue forecast summary for ${supplier.name}.

Weekly revenue (most recent first): ${revenueValues.slice(0, 6).map((v) => `$${Math.round(v)}`).join(", ")}
4-week projection: $${Math.round(projectedTotal)} (${changePercent > 0 ? "+" : ""}${Math.round(changePercent)}% vs current)
Top customers: ${topCustomers.slice(0, 3).map((c) => `${c.name} ($${Math.round(c.revenue)})`).join(", ")}
Top categories: ${topCategories.slice(0, 3).map((c) => `${c.category} ($${Math.round(c.revenue)})`).join(", ")}

Highlight growth or contraction drivers and key opportunities. Be concise.`,
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
            summary = textBlock?.text || `4-week revenue forecast: projected $${Math.round(projectedTotal)} (${changePercent > 0 ? "+" : ""}${Math.round(changePercent)}% vs current period).`;
          } catch {
            summary = `4-week revenue forecast: projected $${Math.round(projectedTotal)} (${changePercent > 0 ? "+" : ""}${Math.round(changePercent)}% vs current period).`;
          }
        } else {
          summary = `4-week revenue forecast: projected $${Math.round(projectedTotal)} (${changePercent > 0 ? "+" : ""}${Math.round(changePercent)}% vs current period).`;
        }

        // Expire old forecasts
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "REVENUE_FORECAST",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "REVENUE_FORECAST",
            title: "4-Week Revenue Forecast",
            summary,
            data: {
              weeklyRevenue: revenueValues,
              projections,
              projectedTotal: Math.round(projectedTotal * 100) / 100,
              currentPeriodRevenue: Math.round(currentPeriodRevenue * 100) / 100,
              changePercent: Math.round(changePercent * 10) / 10,
              topCustomers,
              topCategories,
            },
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days
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
              title: "Revenue Forecast Ready",
              message: `4-week revenue forecast: projected $${Math.round(projectedTotal)} (${changePercent > 0 ? "+" : ""}${Math.round(changePercent)}% vs current period)`,
              userId: user.id,
              metadata: {
                actionUrl: "/supplier/insights",
                action: "view_insights",
              },
            },
          });
        }

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-revenue-forecast] failed:", err);
      throw err;
    }
  }
);
