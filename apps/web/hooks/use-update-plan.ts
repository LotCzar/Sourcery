import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planTier: string) =>
      apiFetch("/api/admin/plan", {
        method: "PATCH",
        body: JSON.stringify({ planTier }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}
