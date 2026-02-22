import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { sendEmail, emailTemplates } from "@/lib/email";

interface WeeklyMetrics {
  totalSpend: number;
  orderCount: number;
  lowStockCount: number;
  priceAlerts: number;
  wastePercent: number;
  overdueInvoices: number;
  spendChangePercent: number | null;
}

function buildFallbackSummary(
  restaurantName: string,
  metrics: WeeklyMetrics
): string {
  const parts: string[] = [];

  parts.push(
    `This week ${restaurantName} spent $${metrics.totalSpend.toFixed(2)} across ${metrics.orderCount} orders.`
  );

  if (metrics.spendChangePercent !== null) {
    const direction =
      metrics.spendChangePercent > 0 ? "up" : "down";
    parts.push(
      `Spending is ${direction} ${Math.abs(metrics.spendChangePercent).toFixed(1)}% vs last week.`
    );
  }

  if (metrics.lowStockCount > 0) {
    parts.push(
      `${metrics.lowStockCount} items are below par level.`
    );
  }

  if (metrics.overdueInvoices > 0) {
    parts.push(
      `There are ${metrics.overdueInvoices} overdue invoices requiring attention.`
    );
  }

  return parts.join(" ");
}

export const weeklyDigest = inngest.createFunction(
  { id: "weekly-digest", name: "Smart Weekly Digest" },
  { cron: "0 8 * * 1" }, // Monday 8 AM
  async () => {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
    });

    let digestsSent = 0;

    for (const restaurant of restaurants) {
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: "OWNER" },
      });

      if (!ownerUser?.email) continue;

      // Calculate date ranges
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      // This week's orders (exclude CANCELLED)
      const thisWeekOrders = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          createdAt: { gte: weekStart },
          status: { not: "CANCELLED" },
        },
        select: { total: true, status: true },
      });

      const totalSpend = thisWeekOrders.reduce(
        (sum, o) => sum + Number(o.total),
        0
      );
      const orderCount = thisWeekOrders.length;

      // Last week's spend for comparison
      const lastWeekOrders = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          createdAt: { gte: lastWeekStart, lt: weekStart },
          status: { not: "CANCELLED" },
        },
        select: { total: true },
      });

      const lastWeekSpend = lastWeekOrders.reduce(
        (sum, o) => sum + Number(o.total),
        0
      );

      const spendChangePercent =
        lastWeekSpend > 0
          ? ((totalSpend - lastWeekSpend) / lastWeekSpend) * 100
          : null;

      // Low stock count
      const lowStockItems = await prisma.inventoryItem.findMany({
        where: {
          restaurantId: restaurant.id,
          parLevel: { not: null },
        },
        select: { currentQuantity: true, parLevel: true },
      });

      const lowStockCount = lowStockItems.filter(
        (i) =>
          i.parLevel && Number(i.currentQuantity) <= Number(i.parLevel)
      ).length;

      // Price alerts triggered this week
      const priceAlerts = await prisma.priceAlert.count({
        where: {
          user: { restaurantId: restaurant.id },
          triggeredAt: { gte: weekStart },
        },
      });

      // Waste percentage
      const [wasteLogs, usedLogs] = await Promise.all([
        prisma.inventoryLog.count({
          where: {
            inventoryItem: { restaurantId: restaurant.id },
            changeType: "WASTE",
            createdAt: { gte: weekStart },
          },
        }),
        prisma.inventoryLog.count({
          where: {
            inventoryItem: { restaurantId: restaurant.id },
            changeType: "USED",
            createdAt: { gte: weekStart },
          },
        }),
      ]);

      const wastePercent =
        wasteLogs + usedLogs > 0
          ? (wasteLogs / (wasteLogs + usedLogs)) * 100
          : 0;

      // Overdue invoice count
      const overdueInvoices = await prisma.invoice.count({
        where: {
          restaurantId: restaurant.id,
          status: "OVERDUE",
        },
      });

      const metrics: WeeklyMetrics = {
        totalSpend: Math.round(totalSpend * 100) / 100,
        orderCount,
        lowStockCount,
        priceAlerts,
        wastePercent: Math.round(wastePercent * 10) / 10,
        overdueInvoices,
        spendChangePercent:
          spendChangePercent !== null
            ? Math.round(spendChangePercent * 10) / 10
            : null,
      };

      // Generate AI summary
      let aiSummary: string;
      const anthropic = getAnthropicClient();

      if (anthropic) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 256,
            messages: [
              {
                role: "user",
                content: `You are a restaurant procurement AI. Write a 3-4 sentence actionable briefing for ${restaurant.name}'s weekly digest.

Metrics:
- Total spend: $${metrics.totalSpend.toFixed(2)} (${metrics.orderCount} orders)
- Spend change: ${metrics.spendChangePercent !== null ? `${metrics.spendChangePercent > 0 ? "+" : ""}${metrics.spendChangePercent.toFixed(1)}% vs last week` : "no previous data"}
- Low stock items: ${metrics.lowStockCount}
- Price alerts triggered: ${metrics.priceAlerts}
- Waste rate: ${metrics.wastePercent.toFixed(1)}%
- Overdue invoices: ${metrics.overdueInvoices}

Be concise, highlight what needs attention, and suggest 1-2 actions.`,
              },
            ],
          });

          const textBlock = response.content.find((b) => b.type === "text");
          aiSummary = textBlock?.text || buildFallbackSummary(restaurant.name, metrics);
        } catch {
          aiSummary = buildFallbackSummary(restaurant.name, metrics);
        }
      } else {
        aiSummary = buildFallbackSummary(restaurant.name, metrics);
      }

      // Send email
      const template = emailTemplates.weeklyDigest(
        restaurant.name,
        aiSummary,
        metrics
      );

      await sendEmail({
        to: ownerUser.email,
        subject: template.subject,
        html: template.html,
      });

      // Create notification
      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: "Weekly Digest Sent",
          message: `Your weekly digest for ${restaurant.name} has been sent to ${ownerUser.email}.`,
          userId: ownerUser.id,
          metadata: {
            action: "view_dashboard",
            actionUrl: "/dashboard",
            ...metrics,
          },
        },
      });

      digestsSent++;
    }

    return {
      restaurantsProcessed: restaurants.length,
      digestsSent,
    };
  }
);
