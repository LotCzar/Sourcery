import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

export function useUpdateSupplierPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planTier: string) =>
      apiFetch("/api/supplier/plan", {
        method: "PATCH",
        body: JSON.stringify({ planTier }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.aiUsage });
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.settings });
    },
  });
}
