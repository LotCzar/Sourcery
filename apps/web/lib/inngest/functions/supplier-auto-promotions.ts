import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { trackAiUsage } from "@/lib/ai/usage";
import { getSupplierJobTier, hasTier, type PlanTier } from "@/lib/tier";

export const supplierAutoPromotions = inngest.createFunction(
  { id: "supplier-auto-promotions", name: "Supplier Auto-Promotion Engine" },
  { cron: "0 9 * * *" }, // Daily 9 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true, planTier: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        if (!hasTier(supplier.planTier as PlanTier, getSupplierJobTier("supplier-auto-promotions"))) continue;

        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

        // Get products with stock
        const products = await prisma.supplierProduct.findMany({
          where: {
            supplierId: supplier.id,
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

        const suggestions: any[] = [];

        for (const product of products) {
          // Get recent 2 weeks and prior 2 weeks of sales
          const [recentItems, priorItems] = await Promise.all([
            prisma.orderItem.findMany({
              where: {
                productId: product.id,
                order: {
                  supplierId: supplier.id,
                  status: { not: "CANCELLED" },
                  createdAt: { gte: twoWeeksAgo },
                },
              },
              select: { quantity: true },
            }),
            prisma.orderItem.findMany({
              where: {
                productId: product.id,
                order: {
                  supplierId: supplier.id,
                  status: { not: "CANCELLED" },
                  createdAt: { gte: fourWeeksAgo, lt: twoWeeksAgo },
                },
              },
              select: { quantity: true },
            }),
          ]);

          const recentVelocity = recentItems.reduce((s, i) => s + Number(i.quantity), 0);
          const priorVelocity = priorItems.reduce((s, i) => s + Number(i.quantity), 0);

          // Check for declining velocity (> 30% drop)
          if (priorVelocity === 0) continue;
          const velocityDrop = (priorVelocity - recentVelocity) / priorVelocity;
          if (velocityDrop < 0.3) continue;

          // Check high stock (> 2x weekly velocity)
          const weeklyVelocity = recentVelocity / 2; // 2-week period
          const stock = product.stockQuantity || 0;
          if (weeklyVelocity > 0 && stock < weeklyVelocity * 2) continue;

          // Determine discount level
          let discountPercent = 10;
          let rationale = "Declining sales velocity with high stock levels";

          if (product.expirationDate) {
            const daysUntilExpiry = Math.floor(
              (product.expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
            );
            if (daysUntilExpiry <= 7) {
              discountPercent = 30;
              rationale = `Expires in ${daysUntilExpiry} days with ${stock} units remaining`;
            } else if (daysUntilExpiry <= 14) {
              discountPercent = 20;
              rationale = `Expires in ${daysUntilExpiry} days, sales declining ${Math.round(velocityDrop * 100)}%`;
            } else {
              discountPercent = 15;
              rationale = `Sales down ${Math.round(velocityDrop * 100)}%, ${daysUntilExpiry} days until expiry`;
            }
          }

          suggestions.push({
            productId: product.id,
            productName: product.name,
            category: product.category,
            currentPrice: Number(product.price),
            discountPercent,
            suggestedPrice: Math.round(Number(product.price) * (1 - discountPercent / 100) * 100) / 100,
            rationale,
            recentVelocity: Math.round(recentVelocity * 10) / 10,
            priorVelocity: Math.round(priorVelocity * 10) / 10,
            velocityDropPercent: Math.round(velocityDrop * 100),
            stockQuantity: stock,
            expirationDate: product.expirationDate,
          });
        }

        if (suggestions.length === 0) continue;

        // Create draft promotions
        let promotionsCreated = 0;
        for (const suggestion of suggestions) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 7);

          await prisma.promotion.create({
            data: {
              type: "PERCENTAGE_OFF",
              value: suggestion.discountPercent,
              description: suggestion.rationale,
              isActive: false, // Draft
              startDate,
              endDate,
              supplierId: supplier.id,
              products: { connect: [{ id: suggestion.productId }] },
            },
          });
          promotionsCreated++;
        }

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
                  content: `You are a merchandising AI. Write a 3-5 sentence summary of draft promotions created for ${supplier.name}.

Promotions:
${suggestions.slice(0, 10).map((s) => `- ${s.productName}: ${s.discountPercent}% off ($${s.currentPrice} → $${s.suggestedPrice}), reason: ${s.rationale}`).join("\n")}

Total draft promotions: ${promotionsCreated}
Explain the strategy and recommend review priorities. Be concise.`,
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
            summary = textBlock?.text || `${promotionsCreated} draft promotions created for slow-moving inventory.`;
          } catch {
            summary = `${promotionsCreated} draft promotions created for slow-moving inventory.`;
          }
        } else {
          summary = `${promotionsCreated} draft promotions created for slow-moving inventory.`;
        }

        // Expire old insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "PROMOTION_SUGGESTION",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "PROMOTION_SUGGESTION",
            title: "Auto-Generated Promotions",
            summary,
            data: { suggestions, promotionsCreated },
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
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
              title: "Draft Promotions Created",
              message: `${promotionsCreated} draft promotions created for slow-moving inventory`,
              userId: user.id,
              metadata: {
                actionUrl: "/supplier/promotions",
                action: "view_promotions",
              },
            },
          });
        }

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-auto-promotions] failed:", err);
      throw err;
    }
  }
);
