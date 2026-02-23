import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateCost } from "@/lib/ai/cost-config";
import { hasTier, ROUTE_TIER } from "@/lib/tier";

const VALID_RANGES = new Set(["7", "30", "90"]);
const ALL_FEATURES = [
  "CHAT",
  "PARSE_MENU",
  "PARSE_RECEIPT",
  "SEARCH",
  "WEEKLY_DIGEST",
] as const;

export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { restaurant: { select: { id: true, planTier: true } } },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (!hasTier(user.restaurant.planTier, ROUTE_TIER.AI_USAGE_ANALYTICS)) {
      return NextResponse.json(
        {
          error: "Professional plan required",
          message: "AI usage analytics require a Professional plan. Upgrade in Settings to access this feature.",
          upgradeUrl: "/settings",
          currentTier: user.restaurant.planTier,
          requiredTier: ROUTE_TIER.AI_USAGE_ANALYTICS,
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get("range") || "30";
    const range = VALID_RANGES.has(rangeParam) ? rangeParam : "30";
    const days = parseInt(range, 10);

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - days + 1);

    const { id: restaurantId } = user.restaurant;

    const logs = await prisma.aiUsageLog.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
      select: {
        feature: true,
        userId: true,
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
        createdAt: true,
      },
    });

    // Build time-series grouped by date + feature
    const dateMap = new Map<
      string,
      Record<string, { count: number; cost: number }>
    >();

    // Pre-fill all dates with zeros
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const featureMap: Record<string, { count: number; cost: number }> = {};
      for (const f of ALL_FEATURES) {
        featureMap[f] = { count: 0, cost: 0 };
      }
      dateMap.set(key, featureMap);
    }

    // Per-user aggregation
    const userMap = new Map<
      string,
      { requestCount: number; totalCost: number }
    >();

    let totalRequests = 0;
    let totalCost = 0;

    for (const log of logs) {
      const dateKey = log.createdAt.toISOString().slice(0, 10);
      const cost = calculateCost({
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        cacheReadTokens: log.cacheReadTokens,
        cacheWriteTokens: log.cacheWriteTokens,
      });

      totalRequests++;
      totalCost += cost;

      // Time-series
      const dayEntry = dateMap.get(dateKey);
      if (dayEntry) {
        const featureEntry = dayEntry[log.feature];
        if (featureEntry) {
          featureEntry.count++;
          featureEntry.cost += cost;
        }
      }

      // Per-user
      const uid = log.userId ?? "__system__";
      const existing = userMap.get(uid);
      if (existing) {
        existing.requestCount++;
        existing.totalCost += cost;
      } else {
        userMap.set(uid, { requestCount: 1, totalCost: cost });
      }
    }

    // Convert time-series to array
    const timeSeries = Array.from(dateMap.entries()).map(
      ([date, features]) => {
        const dayCost = Object.values(features).reduce(
          (sum, f) => sum + f.cost,
          0
        );
        return {
          date,
          CHAT: features.CHAT.count,
          PARSE_MENU: features.PARSE_MENU.count,
          PARSE_RECEIPT: features.PARSE_RECEIPT.count,
          SEARCH: features.SEARCH.count,
          WEEKLY_DIGEST: features.WEEKLY_DIGEST.count,
          totalCost: Math.round(dayCost * 1_000_000) / 1_000_000,
        };
      }
    );

    // Resolve user names
    const userIds = Array.from(userMap.keys()).filter(
      (id) => id !== "__system__"
    );
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const userNameMap = new Map(
      users.map((u) => [
        u.id,
        [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown",
      ])
    );

    const perUser = Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: userId === "__system__" ? "System Jobs" : (userNameMap.get(userId) ?? "Unknown"),
        requestCount: data.requestCount,
        totalCost: Math.round(data.totalCost * 1_000_000) / 1_000_000,
      }))
      .sort((a, b) => b.requestCount - a.requestCount);

    return NextResponse.json({
      success: true,
      data: {
        range: parseInt(range, 10),
        totalRequests,
        totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
        timeSeries,
        perUser,
      },
    });
  } catch (error: any) {
    console.error("AI usage analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
