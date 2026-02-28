import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { trackAiUsage } from "@/lib/ai/usage";

export const supplierDemandForecast = inngest.createFunction(
  { id: "supplier-demand-forecast", name: "Supplier Demand Forecast" },
  { cron: "0 22 * * 0" }, // Sunday 10 PM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        // Get last 12 weeks of order items grouped by product
        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

        const orderItems = await prisma.orderItem.findMany({
          where: {
            order: {
              supplierId: supplier.id,
              status: { not: "CANCELLED" },
              createdAt: { gte: twelveWeeksAgo },
            },
          },
          include: {
            product: { select: { id: true, name: true, category: true, price: true } },
            order: { select: { createdAt: true } },
          },
        });

        if (orderItems.length === 0) continue;

        // Group by product and week
        const productWeekly: Record<string, { name: string; category: string; weeks: Record<number, number> }> = {};

        for (const item of orderItems) {
          const productId = item.productId;
          if (!productWeekly[productId]) {
            productWeekly[productId] = {
              name: item.product.name,
              category: item.product.category,
              weeks: {},
            };
          }
          const weekNum = Math.floor(
            (Date.now() - item.order.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          );
          productWeekly[productId].weeks[weekNum] =
            (productWeekly[productId].weeks[weekNum] || 0) + Number(item.quantity);
        }

        // Calculate trends for top products
        const productTrends = Object.entries(productWeekly)
          .map(([productId, data]) => {
            const weekNums = Object.keys(data.weeks).map(Number).sort((a, b) => b - a);
            const quantities = weekNums.map((w) => data.weeks[w] || 0);
            const n = quantities.length;

            // Simple linear regression
            let trend = "stable";
            if (n >= 4) {
              const xMean = (n - 1) / 2;
              const yMean = quantities.reduce((s, v) => s + v, 0) / n;
              let num = 0, den = 0;
              for (let i = 0; i < n; i++) {
                num += (i - xMean) * (quantities[i] - yMean);
                den += (i - xMean) ** 2;
              }
              const slope = den !== 0 ? num / den : 0;
              const pctChange = yMean > 0 ? (slope / yMean) * 100 : 0;
              if (pctChange > 10) trend = "increasing";
              else if (pctChange < -10) trend = "decreasing";
            }

            const avgQuantity = quantities.length > 0
              ? quantities.reduce((s, v) => s + v, 0) / quantities.length
              : 0;

            return {
              productId,
              name: data.name,
              category: data.category,
              avgWeeklyQuantity: Math.round(avgQuantity * 10) / 10,
              trend,
              weeksOfData: n,
            };
          })
          .filter((p) => p.weeksOfData >= 3)
          .sort((a, b) => b.avgWeeklyQuantity - a.avgWeeklyQuantity)
          .slice(0, 20);

        if (productTrends.length === 0) continue;

        // Use AI to generate summary
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
                  content: `You are a supply chain AI. Write a 3-5 sentence demand forecast summary for ${supplier.name}.

Product trends (top items):
${productTrends.slice(0, 10).map((p) => `- ${p.name} (${p.category}): avg ${p.avgWeeklyQuantity}/week, trend: ${p.trend}`).join("\n")}

Increasing products: ${productTrends.filter((p) => p.trend === "increasing").length}
Decreasing products: ${productTrends.filter((p) => p.trend === "decreasing").length}
Stable products: ${productTrends.filter((p) => p.trend === "stable").length}

Highlight key trends and suggest actions (stock up, reduce inventory, etc.). Be concise.`,
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
            summary = textBlock?.text || `Demand forecast for ${productTrends.length} products analyzed.`;
          } catch {
            summary = `Demand forecast: ${productTrends.filter((p) => p.trend === "increasing").length} products trending up, ${productTrends.filter((p) => p.trend === "decreasing").length} trending down.`;
          }
        } else {
          summary = `Demand forecast: ${productTrends.filter((p) => p.trend === "increasing").length} products trending up, ${productTrends.filter((p) => p.trend === "decreasing").length} trending down.`;
        }

        // Expire old forecasts
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "DEMAND_FORECAST",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        // Create new insight
        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "DEMAND_FORECAST",
            title: "Weekly Demand Forecast",
            summary,
            data: { products: productTrends },
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days
          },
        });

        // Notify supplier users about new forecast
        const users = await prisma.user.findMany({
          where: { supplierId: supplier.id },
          select: { id: true },
        });
        for (const user of users) {
          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Weekly Demand Forecast Ready",
              message: `New demand forecast: ${productTrends.filter((p) => p.trend === "increasing").length} products trending up, ${productTrends.filter((p) => p.trend === "decreasing").length} trending down.`,
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
      console.error("[supplier-demand-forecast] failed:", err);
      throw err;
    }
  }
);
