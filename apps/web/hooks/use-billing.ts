import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface CheckoutResponse {
  success: boolean;
  data: { url: string };
}

interface PortalResponse {
  success: boolean;
  data: { url: string };
}

export function useBillingCheckout() {
  return useMutation({
    mutationFn: (planTier: string) =>
      apiFetch<CheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planTier }),
      }),
    onSuccess: (result) => {
      if (result.data.url) {
        window.location.href = result.data.url;
      }
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () =>
      apiFetch<PortalResponse>("/api/billing/portal", {
        method: "POST",
      }),
    onSuccess: (result) => {
      if (result.data.url) {
        window.location.href = result.data.url;
      }
    },
  });
}
