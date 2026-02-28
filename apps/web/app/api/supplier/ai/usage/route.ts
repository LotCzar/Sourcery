import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  PLAN_LIMITS,
  FEATURE_GROUPS,
  getPeriodStart,
  getNextPeriodStart,
} from "@/lib/ai/plan-config";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { supplier: { select: { id: true, planTier: true } } },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const { id: supplierId, planTier } = user.supplier;
    const periodStart = getPeriodStart();
    const limits = PLAN_LIMITS[planTier];

    // Count usage for each bucket in parallel
    const [chatUsed, parseUsed, searchUsed] = await Promise.all([
      prisma.aiUsageLog.count({
        where: {
          supplierId,
          feature: { in: FEATURE_GROUPS.chatOpsPerMonth },
          periodStart,
        },
      }),
      prisma.aiUsageLog.count({
        where: {
          supplierId,
          feature: { in: FEATURE_GROUPS.parseOpsPerMonth },
          periodStart,
        },
      }),
      prisma.aiUsageLog.count({
        where: {
          supplierId,
          feature: { in: FEATURE_GROUPS.searchOpsPerMonth },
          periodStart,
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        tier: planTier,
        periodStart: periodStart.toISOString(),
        resetAt: getNextPeriodStart().toISOString(),
        features: {
          chat: {
            used: chatUsed,
            limit: limits.chatOpsPerMonth,
            remaining: Math.max(0, limits.chatOpsPerMonth - chatUsed),
          },
          parse: {
            used: parseUsed,
            limit: limits.parseOpsPerMonth,
            remaining: Math.max(0, limits.parseOpsPerMonth - parseUsed),
          },
          search: {
            used: searchUsed,
            limit: limits.searchOpsPerMonth,
            remaining: Math.max(0, limits.searchOpsPerMonth - searchUsed),
          },
        },
      },
    });
  } catch (error: any) {
    console.error("Supplier AI usage API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI usage" },
      { status: 500 }
    );
  }
}
