import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const consumptionAnalysis = inngest.createFunction(
  { id: "consumption-analysis", name: "Weekly Consumption Analysis" },
  { cron: "0 7 * * 0" }, // Sunday 7 AM
  async () => {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
    });

    let totalInsights = 0;
    let totalCritical = 0;

    for (const restaurant of restaurants) {
      const items = await prisma.inventoryItem.findMany({
        where: { restaurantId: restaurant.id },
        include: {
          supplierProduct: {
            include: { supplier: { select: { leadTimeDays: true } } },
          },
        },
      });

      const criticalItems: string[] = [];

      for (const item of items) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await prisma.inventoryLog.findMany({
          where: {
            inventoryItemId: item.id,
            changeType: { in: ["USED", "WASTE"] },
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: "asc" },
        });

        if (logs.length < 3) continue; // Need minimum data points

        // Calculate total usage across the actual time span
        const totalUsage = logs.reduce(
          (sum, log) => sum + Math.abs(Number(log.quantity)),
          0
        );

        const firstLog = logs[0];
        const lastLog = logs[logs.length - 1];
        const actualDays = Math.max(
          1,
          (lastLog.createdAt.getTime() - firstLog.createdAt.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const avgDailyUsage = totalUsage / actualDays;
        const avgWeeklyUsage = avgDailyUsage * 7;

        // Trend: compare last 2 weeks vs prior 2 weeks
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const recentLogs = logs.filter((l) => l.createdAt >= twoWeeksAgo);
        const priorLogs = logs.filter(
          (l) => l.createdAt >= fourWeeksAgo && l.createdAt < twoWeeksAgo
        );

        const recentUsage = recentLogs.reduce(
          (sum, l) => sum + Math.abs(Number(l.quantity)),
          0
        );
        const priorUsage = priorLogs.reduce(
          (sum, l) => sum + Math.abs(Number(l.quantity)),
          0
        );

        let trendDirection: "UP" | "DOWN" | "STABLE" = "STABLE";
        if (priorUsage > 0) {
          const changePercent =
            ((recentUsage - priorUsage) / priorUsage) * 100;
          if (changePercent > 15) trendDirection = "UP";
          else if (changePercent < -15) trendDirection = "DOWN";
        }

        // Days until stockout
        const currentQuantity = Number(item.currentQuantity);
        const daysUntilStockout =
          avgDailyUsage > 0 ? currentQuantity / avgDailyUsage : null;

        // Suggested par level
        const leadTimeDays =
          item.supplierProduct?.supplier?.leadTimeDays ?? 3;
        const suggestedParLevel = Math.ceil(
          avgDailyUsage * leadTimeDays * 1.5
        );

        await prisma.consumptionInsight.upsert({
          where: {
            restaurantId_inventoryItemId: {
              restaurantId: restaurant.id,
              inventoryItemId: item.id,
            },
          },
          create: {
            restaurantId: restaurant.id,
            inventoryItemId: item.id,
            avgDailyUsage,
            avgWeeklyUsage,
            trendDirection,
            daysUntilStockout,
            suggestedParLevel,
            dataPointCount: logs.length,
            periodDays: Math.round(actualDays),
            lastAnalyzedAt: new Date(),
          },
          update: {
            avgDailyUsage,
            avgWeeklyUsage,
            trendDirection,
            daysUntilStockout,
            suggestedParLevel,
            dataPointCount: logs.length,
            periodDays: Math.round(actualDays),
            lastAnalyzedAt: new Date(),
          },
        });

        totalInsights++;

        // Track critical items (< 3 days runway)
        if (daysUntilStockout !== null && daysUntilStockout < 3) {
          criticalItems.push(
            `${item.name} (~${Math.round(daysUntilStockout * 10) / 10} days left)`
          );
        }
      }

      // Notify restaurant owner about critical items
      if (criticalItems.length > 0) {
        totalCritical += criticalItems.length;

        const ownerUser = await prisma.user.findFirst({
          where: { restaurantId: restaurant.id, role: "OWNER" },
        });

        if (ownerUser) {
          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Weekly Consumption Report",
              message: `${criticalItems.length} item(s) at risk of running out soon: ${criticalItems.join(", ")}`,
              userId: ownerUser.id,
              metadata: { criticalItems },
            },
          });
        }
      }
    }

    return {
      restaurantsProcessed: restaurants.length,
      insightsGenerated: totalInsights,
      criticalItems: totalCritical,
    };
  }
);
