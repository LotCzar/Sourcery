import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const supplierPerformance = inngest.createFunction(
  { id: "supplier-performance", name: "Supplier Performance Scoring" },
  { cron: "0 23 * * 0" }, // Sunday 11 PM
  async () => {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
    });

    let totalAlerts = 0;

    for (const restaurant of restaurants) {
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: "OWNER" },
      });

      if (!ownerUser) continue;

      const relationships = await prisma.restaurantSupplier.findMany({
        where: { restaurantId: restaurant.id },
        include: { supplier: true },
      });

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      for (const rel of relationships) {
        const supplier = rel.supplier;

        const deliveredOrders = await prisma.order.findMany({
          where: {
            restaurantId: restaurant.id,
            supplierId: supplier.id,
            status: "DELIVERED",
            deliveredAt: { gte: ninetyDaysAgo },
          },
          include: {
            invoice: { select: { total: true } },
          },
        });

        if (deliveredOrders.length < 5) continue;

        // On-time %
        let onTimeCount = 0;
        let hasDeliveryDateCount = 0;
        for (const order of deliveredOrders) {
          if (!order.deliveryDate || !order.deliveredAt) continue;
          hasDeliveryDateCount++;
          const grace = new Date(order.deliveryDate);
          grace.setDate(grace.getDate() + 1);
          if (order.deliveredAt <= grace) {
            onTimeCount++;
          }
        }
        const onTimePercent = hasDeliveryDateCount > 0
          ? Math.round((onTimeCount / hasDeliveryDateCount) * 10000) / 100
          : 100;

        // Accuracy %
        let accurateCount = 0;
        let hasInvoiceCount = 0;
        for (const order of deliveredOrders) {
          if (!order.invoice) continue;
          hasInvoiceCount++;
          const orderTotal = Number(order.total);
          const invoiceTotal = Number(order.invoice.total);
          if (Math.abs(invoiceTotal - orderTotal) <= orderTotal * 0.01) {
            accurateCount++;
          }
        }
        const accuracyPercent = hasInvoiceCount > 0
          ? Math.round((accurateCount / hasInvoiceCount) * 10000) / 100
          : 100;

        // Price stability
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentItems = await prisma.orderItem.findMany({
          where: {
            order: {
              restaurantId: restaurant.id,
              supplierId: supplier.id,
              status: "DELIVERED",
              deliveredAt: { gte: thirtyDaysAgo },
            },
          },
          select: { productId: true, unitPrice: true },
        });

        const productPrices: Record<string, number[]> = {};
        for (const item of recentItems) {
          if (!productPrices[item.productId]) productPrices[item.productId] = [];
          productPrices[item.productId].push(Number(item.unitPrice));
        }

        let totalCV = 0;
        let cvCount = 0;
        for (const prices of Object.values(productPrices)) {
          if (prices.length < 2) continue;
          const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
          if (mean === 0) continue;
          const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
          const cv = Math.sqrt(variance) / mean;
          totalCV += cv;
          cvCount++;
        }

        const avgCV = cvCount > 0 ? totalCV / cvCount : 0;
        const priceStabilityPercent = Math.round(Math.max(0, 1 - avgCV * 10) * 10000) / 100;

        // Composite score
        const composite = Math.round(
          (onTimePercent * 0.4 + accuracyPercent * 0.3 + priceStabilityPercent * 0.3) * 100
        ) / 100;

        // Alert if any metric is below threshold
        const shouldAlert =
          onTimePercent < 80 || accuracyPercent < 90 || priceStabilityPercent < 70;

        if (shouldAlert) {
          const issues: string[] = [];
          if (onTimePercent < 80) issues.push(`on-time delivery at ${onTimePercent}%`);
          if (accuracyPercent < 90) issues.push(`invoice accuracy at ${accuracyPercent}%`);
          if (priceStabilityPercent < 70) issues.push(`price stability at ${priceStabilityPercent}%`);

          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Supplier Performance Alert",
              message: `${supplier.name} has performance concerns: ${issues.join(", ")}. Composite score: ${composite}/100.`,
              userId: ownerUser.id,
              metadata: {
                supplierId: supplier.id,
                supplierName: supplier.name,
                onTimePercent,
                accuracyPercent,
                priceStabilityPercent,
                composite,
                ordersAnalyzed: deliveredOrders.length,
                actionUrl: `/suppliers/${supplier.id}`,
              },
            },
          });

          totalAlerts++;
        }
      }
    }

    return {
      restaurantsProcessed: restaurants.length,
      alertsSent: totalAlerts,
    };
  }
);
