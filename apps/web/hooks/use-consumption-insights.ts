"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

export interface ConsumptionInsight {
  id: string;
  inventoryItemId: string;
  itemName: string;
  category: string;
  unit: string;
  currentQuantity: number;
  currentParLevel: number | null;
  avgDailyUsage: number;
  avgWeeklyUsage: number;
  trendDirection: "UP" | "DOWN" | "STABLE";
  daysUntilStockout: number | null;
  suggestedParLevel: number | null;
  dataPointCount: number;
  periodDays: number;
  lastAnalyzedAt: string;
}

interface InsightsResponse {
  success: boolean;
  data: ConsumptionInsight[];
  summary: {
    totalInsights: number;
    criticalItemCount: number;
    parMismatchCount: number;
  };
}

export function useConsumptionInsights() {
  return useQuery({
    queryKey: queryKeys.inventory.insights,
    queryFn: () => apiFetch<InsightsResponse>("/api/inventory/insights"),
  });
}
