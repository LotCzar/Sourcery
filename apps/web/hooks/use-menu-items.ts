"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface IngredientData {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  supplierProduct: { id: string; name: string } | null;
}

interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  isActive: boolean;
  posItemId: string | null;
  ingredients: IngredientData[];
  createdAt: string;
  updatedAt: string;
}

interface MenuItemsResponse {
  success: boolean;
  data: MenuItemData[];
  summary: {
    totalItems: number;
    activeCount: number;
    inactiveCount: number;
    categories: string[];
  };
}

export type { MenuItemData, IngredientData };

export function useMenuItems(filters?: {
  category?: string;
  active?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== "all")
    params.set("category", filters.category);
  if (filters?.active && filters.active !== "all")
    params.set("active", filters.active);
  if (filters?.search) params.set("search", filters.search);

  const queryString = params.toString();
  const url = `/api/menu-items${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.menuItems.filtered({
      category: filters?.category,
      active: filters?.active,
      search: filters?.search,
    }),
    queryFn: () => apiFetch<MenuItemsResponse>(url),
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string | null;
      price?: number;
      category?: string | null;
      isActive?: boolean;
    }) =>
      apiFetch(`/api/menu-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/menu-items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all });
    },
  });
}

export function useAddIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuItemId,
      ...data
    }: {
      menuItemId: string;
      name: string;
      quantity?: number;
      unit?: string;
      notes?: string;
    }) =>
      apiFetch(`/api/menu-items/${menuItemId}/ingredients`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all });
    },
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuItemId,
      ingredientId,
      ...data
    }: {
      menuItemId: string;
      ingredientId: string;
      name?: string;
      quantity?: number;
      unit?: string;
      notes?: string | null;
    }) =>
      apiFetch(`/api/menu-items/${menuItemId}/ingredients/${ingredientId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuItemId,
      ingredientId,
    }: {
      menuItemId: string;
      ingredientId: string;
    }) =>
      apiFetch(`/api/menu-items/${menuItemId}/ingredients/${ingredientId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all });
    },
  });
}
