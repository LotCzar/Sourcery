import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPeriodStart } from "@/lib/ai/plan-config";
import { calculateCost } from "@/lib/ai/cost-config";

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "ORG_ADMIN" || !user.organizationId) {
      return NextResponse.json(
        { error: "Requires ORG_ADMIN role with an organization" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : getPeriodStart();
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : new Date();

    const restaurants = await prisma.restaurant.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, planTier: true },
      orderBy: { name: "asc" },
    });

    const restaurantResults = await Promise.all(
      restaurants.map(async (restaurant) => {
        const groups = await prisma.aiUsageLog.groupBy({
          by: ["feature"],
          where: {
            restaurantId: restaurant.id,
            createdAt: { gte: from, lte: to },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: true,
            cacheWriteTokens: true,
          },
          _count: true,
        });

        const features = groups.map((g) => {
          const cost = calculateCost({
            inputTokens: g._sum.inputTokens ?? 0,
            outputTokens: g._sum.outputTokens ?? 0,
            cacheReadTokens: g._sum.cacheReadTokens ?? 0,
            cacheWriteTokens: g._sum.cacheWriteTokens ?? 0,
          });

          return {
            feature: g.feature,
            requestCount: g._count,
            inputTokens: g._sum.inputTokens ?? 0,
            outputTokens: g._sum.outputTokens ?? 0,
            cacheReadTokens: g._sum.cacheReadTokens ?? 0,
            cacheWriteTokens: g._sum.cacheWriteTokens ?? 0,
            estimatedCost: cost,
          };
        });

        const totalEstimatedCost = features.reduce(
          (sum, f) => sum + f.estimatedCost,
          0
        );

        return {
          id: restaurant.id,
          name: restaurant.name,
          planTier: restaurant.planTier,
          totalEstimatedCost:
            Math.round(totalEstimatedCost * 1_000_000) / 1_000_000,
          features,
        };
      })
    );

    const totalEstimatedCost = restaurantResults.reduce(
      (sum, r) => sum + r.totalEstimatedCost,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        period: { from: from.toISOString(), to: to.toISOString() },
        totalEstimatedCost:
          Math.round(totalEstimatedCost * 1_000_000) / 1_000_000,
        restaurants: restaurantResults,
      },
    });
  } catch (error: unknown) {
    console.error("Org AI costs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI costs" },
      { status: 500 }
    );
  }
}
