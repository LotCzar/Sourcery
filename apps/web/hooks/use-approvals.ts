"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useApprovalRules() {
  return useQuery({
    queryKey: queryKeys.approvals.rules,
    queryFn: () => apiFetch<any>("/api/approval-rules"),
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: queryKeys.approvals.pending,
    queryFn: () => apiFetch<any>("/api/approvals"),
  });
}

export function useCreateApprovalRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { minAmount: number; maxAmount?: number; requiredRole?: string }) =>
      apiFetch<any>("/api/approval-rules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.rules });
    },
  });
}

export function useDeleteApprovalRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<any>(`/api/approval-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.rules });
    },
  });
}

export function useReviewApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status, notes }: { orderId: string; status: "APPROVED" | "REJECTED"; notes?: string }) =>
      apiFetch<any>(`/api/orders/${orderId}/approval`, {
        method: "POST",
        body: JSON.stringify({ status, notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
