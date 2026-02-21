"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { DashboardData } from "@heard/shared";

interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => apiFetch<DashboardResponse>("/api/dashboard"),
  });
}
