"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface OrgRestaurantMetrics {
  id: string;
  name: string;
  mtdSpend: number;
  orderCount: number;
  lowStockCount: number;
  userCount: number;
}

interface OrgRestaurantsResponse {
  success: boolean;
  data: { restaurants: OrgRestaurantMetrics[] };
}

interface OrgSummaryData {
  totalSpend: number;
  lastMonthSpend: number;
  spendChangePercent: number;
  totalOrders: number;
  totalRestaurants: number;
  totalLowStockAlerts: number;
  topSuppliers: { name: string; spend: number }[];
  restaurantBreakdown: { name: string; spend: number }[];
}

interface OrgSummaryResponse {
  success: boolean;
  data: OrgSummaryData;
}

export function useOrgRestaurants() {
  return useQuery({
    queryKey: queryKeys.org.restaurants,
    queryFn: () => apiFetch<OrgRestaurantsResponse>("/api/org/restaurants"),
  });
}

export function useOrgSummary() {
  return useQuery({
    queryKey: queryKeys.org.summary,
    queryFn: () => apiFetch<OrgSummaryResponse>("/api/org/summary"),
  });
}
