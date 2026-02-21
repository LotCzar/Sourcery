import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const priceMonitor = inngest.createFunction(
  { id: "price-monitor", name: "Daily Price Monitor" },
  { cron: "0 6 * * *" },
  async () => {
    // Get all active price alerts
    const alerts = await prisma.priceAlert.findMany({
      where: { isActive: true },
      include: {
        product: {
          include: { supplier: true },
        },
        user: true,
      },
    });

    let triggeredCount = 0;

    for (const alert of alerts) {
      const currentPrice = Number(alert.product.price);
      const targetPrice = Number(alert.targetPrice);
      const previousTriggeredPrice = alert.triggeredPrice
        ? Number(alert.triggeredPrice)
        : null;

      let triggered = false;
      let message = "";

      switch (alert.alertType) {
        case "PRICE_DROP":
          if (currentPrice < targetPrice) {
            triggered = true;
            message = `${alert.product.name} is now $${currentPrice.toFixed(2)}, below your target of $${targetPrice.toFixed(2)} (${alert.product.supplier.name})`;
          }
          break;

        case "PRICE_INCREASE":
          if (currentPrice > targetPrice) {
            triggered = true;
            message = `${alert.product.name} is now $${currentPrice.toFixed(2)}, above your threshold of $${targetPrice.toFixed(2)} (${alert.product.supplier.name})`;
          }
          break;

        case "PRICE_THRESHOLD":
          if (currentPrice <= targetPrice) {
            triggered = true;
            message = `${alert.product.name} is now $${currentPrice.toFixed(2)}, at or below your target of $${targetPrice.toFixed(2)} (${alert.product.supplier.name})`;
          }
          break;
      }

      // Record price history
      await prisma.priceHistory.create({
        data: {
          productId: alert.product.id,
          price: currentPrice,
        },
      });

      // Send notification if triggered and not already triggered at same price
      if (triggered && previousTriggeredPrice !== currentPrice) {
        triggeredCount++;

        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            triggeredAt: new Date(),
            triggeredPrice: currentPrice,
          },
        });

        await prisma.notification.create({
          data: {
            type: "PRICE_ALERT",
            title: "Price Alert Triggered",
            message,
            userId: alert.userId,
            metadata: {
              alertId: alert.id,
              productId: alert.product.id,
              currentPrice,
              action: "view_alerts",
              actionUrl: "/price-alerts",
            },
          },
        });
      }
    }

    return {
      alertsChecked: alerts.length,
      triggered: triggeredCount,
    };
  }
);
