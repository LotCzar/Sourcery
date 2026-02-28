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

export function useSupplierBillingCheckout() {
  return useMutation({
    mutationFn: (planTier: string) =>
      apiFetch<CheckoutResponse>("/api/supplier/billing/checkout", {
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

export function useSupplierBillingPortal() {
  return useMutation({
    mutationFn: () =>
      apiFetch<PortalResponse>("/api/supplier/billing/portal", {
        method: "POST",
      }),
    onSuccess: (result) => {
      if (result.data.url) {
        window.location.href = result.data.url;
      }
    },
  });
}
