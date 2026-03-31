import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { trackAiUsage } from "@/lib/ai/usage";
import { getSupplierJobTier, hasTier, type PlanTier } from "@/lib/tier";

export const supplierExpirationPrevention = inngest.createFunction(
  { id: "supplier-expiration-prevention", name: "Supplier Expiration Loss Prevention" },
  { cron: "0 6 * * *" }, // Daily 6 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true, planTier: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        if (!hasTier(supplier.planTier as PlanTier, getSupplierJobTier("supplier-expiration-prevention"))) continue;

        // Get products with expiration dates set
        const products = await prisma.supplierProduct.findMany({
          where: {
            supplierId: supplier.id,
            isActive: true,
            expirationDate: { not: null },
            inStock: true,
            stockQuantity: { gt: 0 },
          },
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            stockQuantity: true,
            expirationDate: true,
          },
        });

        if (products.length === 0) continue;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const atRiskProducts: any[] = [];

        for (const product of products) {
          // Calculate daily sales velocity from last 30 days
          const orderItems = await prisma.orderItem.findMany({
            where: {
              productId: product.id,
              order: {
                supplierId: supplier.id,
                status: { not: "CANCELLED" },
                createdAt: { gte: thirtyDaysAgo },
              },
            },
            select: { quantity: true },
          });

          const totalSold = orderItems.reduce((sum, i) => sum + Number(i.quantity), 0);
          const dailyVelocity = totalSold / 30;

          const daysUntilExpiry = Math.max(
            0,
            Math.floor(
              (product.expirationDate!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            )
          );

          const stock = product.stockQuantity || 0;
          const daysToSell = dailyVelocity > 0 ? stock / dailyVelocity : Infinity;

          // Flag if stock won't sell before expiry
          if (daysToSell > daysUntilExpiry) {
            const excessUnits = dailyVelocity > 0
              ? Math.ceil(stock - dailyVelocity * daysUntilExpiry)
              : stock;
            const potentialLoss = excessUnits * Number(product.price);

            atRiskProducts.push({
              productId: product.id,
              name: product.name,
              category: product.category,
              stockQuantity: stock,
              dailyVelocity: Math.round(dailyVelocity * 10) / 10,
              daysUntilExpiry,
              daysToSell: daysToSell === Infinity ? null : Math.round(daysToSell),
              excessUnits,
              potentialLoss: Math.round(potentialLoss * 100) / 100,
              expirationDate: product.expirationDate,
            });
          }
        }

        if (atRiskProducts.length === 0) continue;

        atRiskProducts.sort((a, b) => b.potentialLoss - a.potentialLoss);
        const totalPotentialLoss = atRiskProducts.reduce(
          (sum, p) => sum + p.potentialLoss,
          0
        );

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
                  content: `You are a food supply chain AI. Write a 3-5 sentence expiration risk summary for ${supplier.name}.

At-risk products:
${atRiskProducts.slice(0, 10).map((p) => `- ${p.name}: ${p.stockQuantity} units, expires in ${p.daysUntilExpiry} days, sells ${p.dailyVelocity}/day, potential loss $${p.potentialLoss}`).join("\n")}

Total potential loss: $${Math.round(totalPotentialLoss * 100) / 100}

Suggest specific actions: flash discounts, bundle deals, or donations. Be concise and actionable.`,
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
            summary = textBlock?.text || `${atRiskProducts.length} products at risk of expiring — estimated $${Math.round(totalPotentialLoss)} in potential loss.`;
          } catch {
            summary = `${atRiskProducts.length} products at risk of expiring before sale — estimated $${Math.round(totalPotentialLoss)} in potential loss.`;
          }
        } else {
          summary = `${atRiskProducts.length} products at risk of expiring before sale — estimated $${Math.round(totalPotentialLoss)} in potential loss.`;
        }

        // Expire old insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "EXPIRATION_RISK",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "EXPIRATION_RISK",
            title: "Expiration Risk Alert",
            summary,
            data: { products: atRiskProducts, totalPotentialLoss },
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          },
        });

        // Notify supplier users
        const users = await prisma.user.findMany({
          where: { supplierId: supplier.id },
          select: { id: true },
        });
        for (const user of users) {
          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Expiration Risk Alert",
              message: `${atRiskProducts.length} products at risk of expiring before sale — estimated $${Math.round(totalPotentialLoss)} in potential loss`,
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
      console.error("[supplier-expiration-prevention] failed:", err);
      throw err;
    }
  }
);
