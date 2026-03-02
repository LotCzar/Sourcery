import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { trackAiUsage } from "@/lib/ai/usage";
import { getSupplierJobTier, hasTier, type PlanTier } from "@/lib/tier";

export const supplierSeasonalPrep = inngest.createFunction(
  { id: "supplier-seasonal-prep", name: "Supplier Seasonal Prep Alerts" },
  { cron: "0 6 * * 1" }, // Monday 6 AM (1st Monday detection inside)
  async () => {
    try {
      // Only run on first Monday of the month
      const today = new Date();
      if (today.getDate() > 7) {
        return { skipped: true, reason: "Not first week of month" };
      }

      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true, planTier: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        if (!hasTier(supplier.planTier as PlanTier, getSupplierJobTier("supplier-seasonal-prep"))) continue;

        const now = new Date();
        const nextMonth = now.getMonth() + 1;
        const nextMonthYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
        const normalizedNextMonth = nextMonth > 11 ? 0 : nextMonth;

        // Try to get historical data from same month last year
        const lastYearStart = new Date(nextMonthYear - 1, normalizedNextMonth, 1);
        const lastYearEnd = new Date(nextMonthYear - 1, normalizedNextMonth + 1, 0, 23, 59, 59);

        const historicalItems = await prisma.orderItem.findMany({
          where: {
            order: {
              supplierId: supplier.id,
              status: { not: "CANCELLED" },
              createdAt: { gte: lastYearStart, lte: lastYearEnd },
            },
          },
          select: {
            productId: true,
            quantity: true,
            product: { select: { name: true, category: true, stockQuantity: true, price: true } },
          },
        });

        // Current month's velocity for comparison
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const recentItems = await prisma.orderItem.findMany({
          where: {
            order: {
              supplierId: supplier.id,
              status: { not: "CANCELLED" },
              createdAt: { gte: currentMonthStart },
            },
          },
          select: { productId: true, quantity: true },
        });

        // Aggregate demand by product
        const historicalDemand: Record<string, { name: string; category: string; quantity: number; stock: number | null; price: number }> = {};
        for (const item of historicalItems) {
          if (!historicalDemand[item.productId]) {
            historicalDemand[item.productId] = {
              name: item.product.name,
              category: item.product.category,
              quantity: 0,
              stock: item.product.stockQuantity,
              price: Number(item.product.price),
            };
          }
          historicalDemand[item.productId].quantity += Number(item.quantity);
        }

        const currentDemand: Record<string, number> = {};
        for (const item of recentItems) {
          currentDemand[item.productId] = (currentDemand[item.productId] || 0) + Number(item.quantity);
        }

        // Flag products where projected demand exceeds current stock
        const alerts: any[] = [];

        for (const [productId, hist] of Object.entries(historicalDemand)) {
          const projectedDemand = hist.quantity;
          const currentStock = hist.stock || 0;
          const currentVelocity = currentDemand[productId] || 0;

          // Estimate replenishment based on current velocity
          const daysInMonth = new Date(nextMonthYear, normalizedNextMonth + 1, 0).getDate();
          const daysSoFar = now.getDate();
          const dailyVelocity = daysSoFar > 0 ? currentVelocity / daysSoFar : 0;
          const expectedReplenishment = dailyVelocity * daysInMonth;

          if (projectedDemand > currentStock + expectedReplenishment) {
            const shortfall = Math.ceil(projectedDemand - currentStock - expectedReplenishment);
            alerts.push({
              productId,
              name: hist.name,
              category: hist.category,
              projectedDemand: Math.round(projectedDemand),
              currentStock,
              expectedReplenishment: Math.round(expectedReplenishment),
              shortfall,
              estimatedCost: Math.round(shortfall * hist.price * 100) / 100,
            });
          }
        }

        if (alerts.length === 0) continue;

        alerts.sort((a, b) => b.shortfall - a.shortfall);

        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        const nextMonthName = monthNames[normalizedNextMonth];

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
                  content: `You are a supply chain AI. Write a 3-5 sentence seasonal prep alert for ${supplier.name} preparing for ${nextMonthName}.

Products that may need increased stock:
${alerts.slice(0, 10).map((a) => `- ${a.name} (${a.category}): projected demand ${a.projectedDemand}, current stock ${a.currentStock}, shortfall ${a.shortfall} units ($${a.estimatedCost})`).join("\n")}

Total products flagged: ${alerts.length}
Recommend stock-up actions and timing. Be concise and actionable.`,
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
            summary = textBlock?.text || `Seasonal prep: ${alerts.length} products may need increased stock for ${nextMonthName}.`;
          } catch {
            summary = `Seasonal prep: ${alerts.length} products may need increased stock for ${nextMonthName}.`;
          }
        } else {
          summary = `Seasonal prep: ${alerts.length} products may need increased stock for ${nextMonthName}.`;
        }

        // Expire old insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "SEASONAL_PREP",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "SEASONAL_PREP",
            title: `${nextMonthName} Seasonal Prep`,
            summary,
            data: {
              targetMonth: nextMonthName,
              alerts,
            },
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
              title: "Seasonal Prep Alert",
              message: `Seasonal prep: ${alerts.length} products may need increased stock for ${nextMonthName}`,
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
      console.error("[supplier-seasonal-prep] failed:", err);
      throw err;
    }
  }
);
