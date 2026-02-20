"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface ProductsResponse {
  success: boolean;
  data: {
    products: any[];
    priceComparisons: any[];
    filters: {
      categories: any[];
      suppliers: any[];
    };
  };
}

export function useProducts(filters?: {
  category?: string;
  search?: string;
  supplierId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== "all")
    params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.supplierId) params.set("supplierId", filters.supplierId);

  const queryString = params.toString();
  const url = `/api/products${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.products.filtered(filters || {}),
    queryFn: () => apiFetch<ProductsResponse>(url),
  });
}
