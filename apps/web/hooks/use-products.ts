"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { ProductWithSupplier } from "@freshsheet/shared";

interface ProductsResponse {
  success: boolean;
  data: {
    products: ProductWithSupplier[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    priceComparisons: any[];
    filters: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categories: any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      suppliers: any[];
    };
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useProducts(filters?: {
  category?: string;
  search?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== "all")
    params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.supplierId) params.set("supplierId", filters.supplierId);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const queryString = params.toString();
  const url = `/api/products${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.products.filtered(filters || {}),
    queryFn: () => apiFetch<ProductsResponse>(url),
  });
}
