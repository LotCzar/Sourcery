import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const budgetAlerts = inngest.createFunction(
  { id: "budget-alerts", name: "Predictive Budget Alerts" },
  { cron: "0 6 * * 1" }, // Monday 6 AM
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

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysElapsed = Math.floor(
        (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysElapsed < 3) continue;

      // MTD spend
      const mtdOrders = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          status: { notIn: ["CANCELLED", "DRAFT"] },
          createdAt: { gte: monthStart },
        },
        include: {
          items: {
            include: { product: { select: { category: true } } },
          },
        },
      });

      const mtdSpend = mtdOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const dailyRunRate = mtdSpend / daysElapsed;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projectedMonthEnd = dailyRunRate * daysInMonth;

      // Historical baseline: last 3 months
      let historicalTotal = 0;
      let validMonthCount = 0;

      for (let i = 1; i <= 3; i++) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthOrders = await prisma.order.findMany({
          where: {
            restaurantId: restaurant.id,
            status: { notIn: ["CANCELLED", "DRAFT"] },
            createdAt: { gte: start, lt: end },
          },
          select: { total: true },
        });

        const spend = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);
        if (spend > 0) {
          historicalTotal += spend;
          validMonthCount++;
        }
      }

      if (validMonthCount === 0) continue;

      const avgMonthlySpend = historicalTotal / validMonthCount;
      const projectionPercent = Math.round(
        (projectedMonthEnd / avgMonthlySpend) * 10000
      ) / 100;

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      for (const order of mtdOrders) {
        for (const item of order.items) {
          const cat = item.product.category;
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(item.subtotal);
        }
      }

      const roundedCategoryBreakdown: Record<string, number> = {};
      for (const [k, v] of Object.entries(categoryBreakdown)) {
        roundedCategoryBreakdown[k] = Math.round(v * 100) / 100;
      }

      let alertLevel: string | null = null;
      let title: string;

      if (projectionPercent > 130) {
        alertLevel = "critical";
        title = "Budget Alert: Significantly Over Pace";
      } else if (projectionPercent > 110) {
        alertLevel = "warning";
        title = "Budget Alert: Above Pace";
      } else {
        continue; // No alert needed
      }

      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title,
          message: `Projected monthly spend of $${projectedMonthEnd.toFixed(2)} is ${projectionPercent}% of your average ($${avgMonthlySpend.toFixed(2)}).`,
          userId: ownerUser.id,
          metadata: {
            alertLevel,
            mtdSpend: Math.round(mtdSpend * 100) / 100,
            projectedMonthEnd: Math.round(projectedMonthEnd * 100) / 100,
            avgMonthlySpend: Math.round(avgMonthlySpend * 100) / 100,
            projectionPercent,
            categoryBreakdown: roundedCategoryBreakdown,
            actionUrl: "/dashboard",
          },
        },
      });

      totalAlerts++;
    }

    return {
      restaurantsProcessed: restaurants.length,
      alertsSent: totalAlerts,
    };
  }
);
