import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { restaurant: true },
  });

  if (!user?.restaurant) {
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const itemName = searchParams.get("itemName");

  const where: any = { restaurantId: user.restaurant.id };

  if (category) {
    where.inventoryItem = { ...where.inventoryItem, category };
  }
  if (itemName) {
    where.inventoryItem = {
      ...where.inventoryItem,
      name: { contains: itemName, mode: "insensitive" },
    };
  }

  const insights = await prisma.consumptionInsight.findMany({
    where,
    include: {
      inventoryItem: {
        select: {
          id: true,
          name: true,
          category: true,
          currentQuantity: true,
          unit: true,
          parLevel: true,
        },
      },
    },
    orderBy: { daysUntilStockout: "asc" },
  });

  const formatted = insights.map((insight) => ({
    id: insight.id,
    inventoryItemId: insight.inventoryItemId,
    itemName: insight.inventoryItem.name,
    category: insight.inventoryItem.category,
    unit: insight.inventoryItem.unit,
    currentQuantity: Number(insight.inventoryItem.currentQuantity),
    currentParLevel: insight.inventoryItem.parLevel
      ? Number(insight.inventoryItem.parLevel)
      : null,
    avgDailyUsage: Number(insight.avgDailyUsage),
    avgWeeklyUsage: Number(insight.avgWeeklyUsage),
    trendDirection: insight.trendDirection,
    daysUntilStockout: insight.daysUntilStockout
      ? Number(insight.daysUntilStockout)
      : null,
    suggestedParLevel: insight.suggestedParLevel
      ? Number(insight.suggestedParLevel)
      : null,
    dataPointCount: insight.dataPointCount,
    periodDays: insight.periodDays,
    lastAnalyzedAt: insight.lastAnalyzedAt.toISOString(),
  }));

  const criticalItemCount = formatted.filter(
    (i) => i.daysUntilStockout !== null && i.daysUntilStockout < 3
  ).length;

  const parMismatchCount = formatted.filter(
    (i) =>
      i.suggestedParLevel !== null &&
      i.currentParLevel !== null &&
      Math.abs(i.suggestedParLevel - i.currentParLevel) >
        i.currentParLevel * 0.2
  ).length;

  return NextResponse.json({
    success: true,
    data: formatted,
    summary: {
      totalInsights: formatted.length,
      criticalItemCount,
      parMismatchCount,
    },
  });
}
