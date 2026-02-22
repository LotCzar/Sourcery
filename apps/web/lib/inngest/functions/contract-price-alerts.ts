import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const contractPriceAlerts = inngest.createFunction(
  { id: "contract-price-alerts", name: "Contract Price Locking Alerts" },
  { cron: "0 7 * * 1" }, // Monday 7 AM
  async () => {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
    });

    let totalOpportunities = 0;
    let totalNotifications = 0;

    for (const restaurant of restaurants) {
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: "OWNER" },
      });

      if (!ownerUser) continue;

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Find frequently ordered products (5+ orders in 90 days)
      const frequentProducts = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            restaurantId: restaurant.id,
            status: "DELIVERED",
            createdAt: { gte: ninetyDaysAgo },
          },
        },
        _count: { id: true },
        _avg: { quantity: true },
        having: {
          id: { _count: { gte: 5 } },
        },
      });

      if (frequentProducts.length === 0) continue;

      const opportunities: Array<{
        productName: string;
        supplier: string;
        currentPrice: number;
        avgPrice: number;
        minPrice: number;
        percentile: number;
        potentialMonthlySavings: number;
      }> = [];

      for (const fp of frequentProducts) {
        const product = await prisma.supplierProduct.findUnique({
          where: { id: fp.productId },
          include: { supplier: { select: { name: true } } },
        });

        if (!product) continue;

        // Get price history
        const priceHistory = await prisma.priceHistory.findMany({
          where: { productId: fp.productId },
          orderBy: { recordedAt: "asc" },
        });

        if (priceHistory.length < 10) continue;

        const currentPrice = Number(product.price);
        const prices = priceHistory.map((h) => Number(h.price));
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const belowCount = sortedPrices.filter((p) => p <= currentPrice).length;
        const percentile = (belowCount / sortedPrices.length) * 100;

        // Check if at or below 10th percentile
        if (percentile <= 10) {
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          const avgQuantity = Number(fp._avg.quantity) || 0;
          const potentialMonthlySavings = Math.round(
            (avgPrice - currentPrice) * avgQuantity * 4 * 100
          ) / 100;

          opportunities.push({
            productName: product.name,
            supplier: product.supplier.name,
            currentPrice,
            avgPrice: Math.round(avgPrice * 100) / 100,
            minPrice: Math.min(...prices),
            percentile: Math.round(percentile * 100) / 100,
            potentialMonthlySavings,
          });

          totalOpportunities++;
        }
      }

      if (opportunities.length > 0) {
        const totalPotentialSavings = Math.round(
          opportunities.reduce((sum, o) => sum + o.potentialMonthlySavings, 0) * 100
        ) / 100;

        await prisma.notification.create({
          data: {
            type: "PRICE_ALERT",
            title: "Price Lock Opportunity",
            message: `${opportunities.length} product(s) are at historic low prices. Potential monthly savings: $${totalPotentialSavings.toFixed(2)}. Ask the AI about price trends for details.`,
            userId: ownerUser.id,
            metadata: {
              opportunities,
              totalPotentialSavings,
              actionUrl: "/orders",
            },
          },
        });
        totalNotifications++;
      }
    }

    return {
      restaurantsProcessed: restaurants.length,
      opportunitiesFound: totalOpportunities,
      notificationsSent: totalNotifications,
    };
  }
);
