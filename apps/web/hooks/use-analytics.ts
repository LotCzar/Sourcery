"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface AnalyticsResponse {
  success: boolean;
  // Analytics data shape varies by consumer — typed locally in each page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export function useAnalytics(timeRange: string = "30") {
  return useQuery({
    queryKey: queryKeys.analytics.byRange(timeRange),
    queryFn: () =>
      apiFetch<AnalyticsResponse>(`/api/analytics?timeRange=${timeRange}`),
  });
}
