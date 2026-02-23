import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface TimeSeriesEntry {
  date: string;
  CHAT: number;
  PARSE_MENU: number;
  PARSE_RECEIPT: number;
  SEARCH: number;
  WEEKLY_DIGEST: number;
  totalCost: number;
}

interface PerUserEntry {
  userId: string;
  name: string;
  requestCount: number;
  totalCost: number;
}

interface AiUsageAnalyticsData {
  success: boolean;
  data: {
    range: number;
    totalRequests: number;
    totalCost: number;
    timeSeries: TimeSeriesEntry[];
    perUser: PerUserEntry[];
  };
}

export function useAiUsageAnalytics(range: string = "30") {
  return useQuery({
    queryKey: queryKeys.aiUsage.analytics(range),
    queryFn: () =>
      apiFetch<AiUsageAnalyticsData>(`/api/ai/usage/analytics?range=${range}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
