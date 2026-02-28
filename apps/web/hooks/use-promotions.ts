"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function usePromotions(supplierId?: string) {
  return useQuery({
    queryKey: queryKeys.promotions.active(supplierId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (supplierId) params.set("supplierId", supplierId);
      const qs = params.toString();
      return apiFetch<any>(`/api/promotions${qs ? `?${qs}` : ""}`);
    },
  });
}
