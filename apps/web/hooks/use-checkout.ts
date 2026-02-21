"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface OrderPayload {
  supplierId: string;
  deliveryNotes?: string;
  items: { productId: string; quantity: number }[];
}

export function useCreateOrders() {
  return useMutation({
    mutationFn: (orders: OrderPayload[]) =>
      Promise.all(
        orders.map((order) =>
          apiFetch("/api/orders", {
            method: "POST",
            body: JSON.stringify(order),
          })
        )
      ),
  });
}
