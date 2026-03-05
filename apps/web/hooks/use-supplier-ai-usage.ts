import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface FeatureUsage {
  used: number;
  limit: number;
  remaining: number;
}

interface SupplierAiUsageData {
  tier: string;
  periodStart: string;
  resetAt: string;
  features: {
    chat: FeatureUsage;
    parse: FeatureUsage;
    search: FeatureUsage;
  };
}

interface SupplierTimeSeriesEntry {
  date: string;
  SUPPLIER_CHAT: number;
  SUPPLIER_DIGEST: number;
  totalCost: number;
}

interface PerUserEntry {
  userId: string;
  name: string;
  requestCount: number;
  totalCost: number;
}

interface SupplierAiUsageAnalyticsData {
  success: boolean;
  data: {
    range: number;
    totalRequests: number;
    totalCost: number;
    timeSeries: SupplierTimeSeriesEntry[];
    perUser: PerUserEntry[];
  };
}

export function useSupplierAiUsage() {
  return useQuery({
    queryKey: queryKeys.supplier.aiUsage,
    queryFn: () => apiFetch<{ data: SupplierAiUsageData }>("/api/supplier/ai/usage"),
    staleTime: 60 * 1000, // 60 seconds
  });
}

export function useSupplierAiUsageAnalytics(range: string = "30") {
  return useQuery({
    queryKey: queryKeys.supplier.aiUsageAnalytics(range),
    queryFn: () =>
      apiFetch<SupplierAiUsageAnalyticsData>(
        `/api/supplier/ai/usage/analytics?range=${range}`
      ),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
