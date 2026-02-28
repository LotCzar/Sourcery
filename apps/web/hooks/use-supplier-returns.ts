"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierReturnRequest {
  id: string;
  returnNumber: string;
  type: string;
  status: string;
  reason: string;
  items: any;
  creditAmount: number | null;
  creditNotes: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  photoUrls: string[];
  orderId: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    restaurant: { id: string; name: string };
  };
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  reviewedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface SupplierReturnsResponse {
  success: boolean;
  data: SupplierReturnRequest[];
}

interface UpdateReturnData {
  action: "approve" | "reject" | "resolve" | "issue_credit";
  resolution?: string;
  creditAmount?: number;
  creditNotes?: string;
}

export function useSupplierReturns() {
  return useQuery({
    queryKey: queryKeys.supplier.returns.all,
    queryFn: () => apiFetch<SupplierReturnsResponse>("/api/supplier/returns"),
  });
}

export function useUpdateSupplierReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReturnData }) =>
      apiFetch(`/api/supplier/returns/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.returns.all });
    },
  });
}
