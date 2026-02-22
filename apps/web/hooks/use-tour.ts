import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

interface TourState {
  tourCompletedAt: string | null;
  tourState: { currentStep: number; completedAt?: string } | null;
  audience: "restaurant" | "supplier";
}

interface TourResponse {
  data: TourState;
}

interface TourUpdateResponse {
  data: {
    tourCompletedAt: string | null;
    tourState: { currentStep: number; completedAt?: string } | null;
  };
}

export function useTourState() {
  return useQuery({
    queryKey: queryKeys.tour.all,
    queryFn: () => apiFetch<TourResponse>("/api/tour"),
  });
}

export function useUpdateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { action: "advance" | "complete" | "reset"; step?: number }) =>
      apiFetch<TourUpdateResponse>("/api/tour", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tour.all });
    },
  });
}
