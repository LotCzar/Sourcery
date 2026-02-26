"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface AddOrgRestaurantData {
  restaurantName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  cuisineTypes?: string[];
  seatingCapacity?: string;
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

export function useAddOrgRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddOrgRestaurantData) =>
      apiFetch("/api/org/restaurants", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.restaurants });
      queryClient.invalidateQueries({ queryKey: queryKeys.org.summary });
    },
  });
}
