"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierDashboardResponse {
  success: boolean;
  data: {
    stats: {
      totalProducts: number;
      pendingOrders: number;
      confirmedOrders: number;
      shippedOrders: number;
      deliveredOrdersThisMonth: number;
      totalRevenue: number;
    };
    recentOrders: any[];
    topProducts: any[];
    supplier: {
      id: string;
      name: string;
      status: string;
    };
  };
}

export function useSupplierDashboard() {
  return useQuery({
    queryKey: queryKeys.supplier.dashboard,
    queryFn: () => apiFetch<SupplierDashboardResponse>("/api/supplier/dashboard"),
  });
}
