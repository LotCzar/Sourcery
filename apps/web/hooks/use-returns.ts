"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface ReturnRequest {
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
    supplier: { id: string; name: string };
  };
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ReturnsResponse {
  success: boolean;
  data: ReturnRequest[];
}

interface CreateReturnData {
  orderId: string;
  type: string;
  reason: string;
  items?: { productId: string; productName: string; quantity: number; unitPrice: number }[];
  photoUrls?: string[];
}

export function useReturns() {
  return useQuery({
    queryKey: queryKeys.returns.all,
    queryFn: () => apiFetch<ReturnsResponse>("/api/returns"),
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReturnData) =>
      apiFetch("/api/returns", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
    },
  });
}
