"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierTeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string;
  isPending: boolean;
  createdAt: string;
}

interface SupplierTeamResponse {
  success: boolean;
  data: SupplierTeamMember[];
}

interface AddSupplierStaffData {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: "SUPPLIER_ADMIN" | "SUPPLIER_REP";
}

interface UpdateSupplierStaffData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: "SUPPLIER_ADMIN" | "SUPPLIER_REP";
}

export function useSupplierTeam() {
  return useQuery({
    queryKey: queryKeys.supplier.team,
    queryFn: () => apiFetch<SupplierTeamResponse>("/api/supplier/team"),
  });
}

export function useAddSupplierStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddSupplierStaffData) =>
      apiFetch("/api/supplier/team", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.team });
    },
  });
}

export function useUpdateSupplierStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierStaffData }) =>
      apiFetch(`/api/supplier/team/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.team });
    },
  });
}

export function useRemoveSupplierStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/supplier/team/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.team });
    },
  });
}
