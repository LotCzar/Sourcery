import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { trackAiUsage } from "@/lib/ai/usage";

export const supplierPricingSuggestions = inngest.createFunction(
  { id: "supplier-pricing-suggestions", name: "Supplier Pricing Suggestions" },
  { cron: "0 9 * * 2" }, // Tuesday 9 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        // Get products with order data
        const products = await prisma.supplierProduct.findMany({
          where: { supplierId: supplier.id },
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            priceHistory: {
              orderBy: { recordedAt: "desc" },
              take: 10,
              select: { price: true, recordedAt: true },
            },
          },
        });

        if (products.length === 0) continue;

        // Get order volume per product over last 8 weeks
        const orderData = await prisma.orderItem.groupBy({
          by: ["productId"],
          where: {
            order: {
              supplierId: supplier.id,
              status: { not: "CANCELLED" },
              createdAt: { gte: eightWeeksAgo },
            },
          },
          _sum: { quantity: true, subtotal: true },
          _count: true,
        });

        const orderMap = new Map(
          orderData.map((d) => [
            d.productId,
            {
              totalQuantity: Number(d._sum.quantity) || 0,
              totalRevenue: Number(d._sum.subtotal) || 0,
              orderCount: d._count,
            },
          ])
        );

        // Analyze each product
        const suggestions: any[] = [];

        for (const product of products) {
          const orderInfo = orderMap.get(product.id);
          if (!orderInfo || orderInfo.orderCount < 3) continue;

          const currentPrice = Number(product.price);
          const priceHistory = product.priceHistory.map((h) => Number(h.price));
          const avgHistoricalPrice = priceHistory.length > 0
            ? priceHistory.reduce((s, p) => s + p, 0) / priceHistory.length
            : currentPrice;

          // Volume-based suggestion
          const weeklyVolume = orderInfo.totalQuantity / 8;
          let suggestion = "maintain";
          let reasoning = "";

          if (weeklyVolume > 0) {
            if (currentPrice < avgHistoricalPrice * 0.9) {
              suggestion = "consider_increase";
              reasoning = "Price is below historical average with steady demand.";
            } else if (orderInfo.orderCount > 20 && currentPrice <= avgHistoricalPrice) {
              suggestion = "consider_increase";
              reasoning = "High demand product with room for price optimization.";
            } else if (orderInfo.orderCount < 5) {
              suggestion = "consider_decrease";
              reasoning = "Low order frequency suggests price sensitivity.";
            }
          }

          if (suggestion !== "maintain") {
            suggestions.push({
              productId: product.id,
              name: product.name,
              category: product.category,
              currentPrice,
              avgHistoricalPrice: Math.round(avgHistoricalPrice * 100) / 100,
              weeklyVolume: Math.round(weeklyVolume * 10) / 10,
              suggestion,
              reasoning,
            });
          }
        }

        if (suggestions.length === 0) continue;

        // Generate AI summary
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
                  content: `You are a pricing strategist for a food supplier. Write a 3-5 sentence pricing optimization summary for ${supplier.name}.

Suggestions:
${suggestions.slice(0, 10).map((s) => `- ${s.name}: ${s.suggestion} (current: $${s.currentPrice}, avg: $${s.avgHistoricalPrice}, ${s.reasoning})`).join("\n")}

Be concise. Focus on actionable advice.`,
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
            summary = textBlock?.text || `${suggestions.length} pricing suggestions generated.`;
          } catch {
            summary = `${suggestions.length} pricing suggestions: ${suggestions.filter((s) => s.suggestion === "consider_increase").length} potential increases, ${suggestions.filter((s) => s.suggestion === "consider_decrease").length} potential decreases.`;
          }
        } else {
          summary = `${suggestions.length} pricing suggestions: ${suggestions.filter((s) => s.suggestion === "consider_increase").length} potential increases, ${suggestions.filter((s) => s.suggestion === "consider_decrease").length} potential decreases.`;
        }

        // Expire old pricing insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "PRICING_SUGGESTION",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "PRICING_SUGGESTION",
            title: "Weekly Pricing Optimization",
            summary,
            data: { suggestions },
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          },
        });

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-pricing-suggestions] failed:", err);
      throw err;
    }
  }
);
