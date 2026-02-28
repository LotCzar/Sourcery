"use client";

import { useState, useCallback, useRef } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// Tools that read data only — no cache invalidation needed
const READ_ONLY_TOOLS = new Set([
  "search_products",
  "get_inventory",
  "get_order_history",
  "compare_prices",
  "get_supplier_info",
  "get_consumption_insights",
  "get_spending_summary",
  "check_invoice",
  "calculate_menu_cost",
  "recommend_supplier",
  "analyze_waste",
  "get_supplier_performance",
  "get_budget_forecast",
  "get_disputed_invoices",
  "get_seasonal_forecast",
  "find_substitutes",
  "get_price_trends",
  "get_benchmarks",
  "get_negotiation_brief",
  "compare_restaurants",
  "org_summary",
  "get_menu_items",
  "get_delivery_status",
  "get_notifications",
  // Supplier read-only tools
  "get_supplier_orders",
  "get_order_details",
  "get_supplier_products",
  "get_customer_list",
  "get_customer_details",
  "get_supplier_invoices",
  "get_revenue_summary",
  "get_top_products",
  "get_delivery_performance",
  "get_demand_forecast",
  "get_pricing_suggestions",
  "get_customer_health",
  "get_supplier_insights",
  "get_return_summary",
  "get_invoice_overview",
  "get_driver_schedule",
  "get_low_stock",
  "get_promotions",
  "generate_pick_list",
]);

// Map mutating tools to the query keys they should invalidate
const TOOL_CACHE_MAP: Record<string, readonly (readonly string[])[]> = {
  create_draft_order: [queryKeys.orders.all, queryKeys.dashboard.all],
  consolidate_orders: [queryKeys.orders.all, queryKeys.dashboard.all],
  reorder_item: [queryKeys.orders.all, queryKeys.dashboard.all, queryKeys.inventory.all],
  generate_restock_list: [queryKeys.orders.all, queryKeys.dashboard.all, queryKeys.inventory.all],
  adjust_inventory: [queryKeys.inventory.all, queryKeys.inventory.insights],
  optimize_par_levels: [queryKeys.inventory.all, queryKeys.inventory.insights],
  create_price_alert: [queryKeys.priceAlerts.all],
  send_order_message: [queryKeys.messages.unread],
  submit_order: [queryKeys.orders.all, queryKeys.dashboard.all, queryKeys.approvals.pending],
  cancel_order: [queryKeys.orders.all, queryKeys.dashboard.all],
  update_order_status: [queryKeys.orders.all, queryKeys.dashboard.all, queryKeys.invoices.all, queryKeys.supplier.orders.all, queryKeys.supplier.dashboard],
  mark_invoice_paid: [queryKeys.invoices.all, queryKeys.dashboard.all],
  add_inventory_item: [queryKeys.inventory.all, queryKeys.inventory.insights],
  duplicate_order: [queryKeys.orders.all, queryKeys.dashboard.all],
  mark_notifications_read: [queryKeys.notifications.all],
  schedule_order: [queryKeys.orders.all, queryKeys.dashboard.all, queryKeys.approvals.pending],
  // Supplier mutating tools
  update_product: [queryKeys.supplier.products.all, queryKeys.supplier.dashboard],
  send_customer_message: [queryKeys.messages.unread],
  adjust_supplier_inventory: [queryKeys.supplier.products.all, queryKeys.supplier.inventory.all, queryKeys.supplier.dashboard],
  create_promotion: [queryKeys.supplier.promotions() as readonly string[], queryKeys.supplier.dashboard],
  manage_return: [queryKeys.supplier.returns.all, queryKeys.supplier.dashboard],
  bulk_update_orders: [queryKeys.supplier.orders.all, queryKeys.supplier.dashboard],
  assign_driver: [queryKeys.supplier.orders.all, queryKeys.supplier.drivers],
  create_product: [queryKeys.supplier.products.all, queryKeys.supplier.dashboard],
  bulk_update_prices: [queryKeys.supplier.products.all, queryKeys.supplier.dashboard],
  manage_promotion: [queryKeys.supplier.promotions() as readonly string[], queryKeys.supplier.dashboard],
  generate_invoice: [queryKeys.supplier.invoices.all, queryKeys.supplier.orders.all, queryKeys.supplier.dashboard],
  record_payment: [queryKeys.supplier.invoices.all, queryKeys.supplier.dashboard],
  handle_dispute: [queryKeys.supplier.invoices.all],
  broadcast_message: [queryKeys.messages.unread],
  update_delivery_eta: [queryKeys.supplier.orders.all],
};

function invalidateCachesForTool(toolName: string, queryClient: QueryClient) {
  if (READ_ONLY_TOOLS.has(toolName)) return;

  const keys = TOOL_CACHE_MAP[toolName];
  if (keys) {
    for (const key of keys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  } else {
    // Unknown mutating tool — broad invalidation as safety net
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
  }
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  isStreaming?: boolean;
}

export interface ActiveToolCall {
  id: string;
  name: string;
  input: any;
  result?: any;
  status: "running" | "complete";
}

export interface RateLimitInfo {
  used: number;
  limit: number;
  resetAt: string;
}

export interface ChatStreamOptions {
  endpoint?: string;
}

export function useChatStream(options?: ChatStreamOptions) {
  const endpoint = options?.endpoint || "/api/ai/chat";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeToolCalls, setActiveToolCalls] = useState<ActiveToolCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async (message: string, existingConversationId?: string | null) => {
      setIsLoading(true);
      setActiveToolCalls([]);
      setRateLimitInfo(null);

      // Add user message immediately
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add placeholder for assistant
      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: existingConversationId ?? conversationId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json();
          if (response.status === 429 && errData.usage) {
            setRateLimitInfo({
              used: errData.usage.used,
              limit: errData.usage.limit,
              resetAt: errData.usage.resetAt,
            });
            // Remove the placeholder assistant message
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            setIsLoading(false);
            return;
          }
          throw new Error(errData.error || "Chat request failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (currentEvent) {
                  case "tool_call":
                    setActiveToolCalls((prev) => [
                      ...prev,
                      {
                        id: data.id,
                        name: data.name,
                        input: data.input,
                        status: "running",
                      },
                    ]);
                    break;

                  case "tool_result":
                    setActiveToolCalls((prev) =>
                      prev.map((tc) =>
                        tc.id === data.id
                          ? { ...tc, result: data.result, status: "complete" }
                          : tc
                      )
                    );
                    // Invalidate relevant caches after tool actions
                    invalidateCachesForTool(data.name, queryClient);
                    break;

                  case "text":
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: m.content + data.text }
                          : m
                      )
                    );
                    break;

                  case "done":
                    if (data.conversationId) {
                      setConversationId(data.conversationId);
                    }
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, isStreaming: false }
                          : m
                      )
                    );
                    setActiveToolCalls([]);
                    break;

                  case "error":
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? {
                              ...m,
                              content:
                                data.message || "An error occurred",
                              isStreaming: false,
                            }
                          : m
                      )
                    );
                    setActiveToolCalls([]);
                    break;
                }
              } catch {
                // Skip malformed JSON
              }
              currentEvent = "";
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: err.message || "Failed to send message",
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        setActiveToolCalls([]);
        abortRef.current = null;
      }
    },
    [conversationId, queryClient, endpoint]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveToolCalls([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    activeToolCalls,
    isLoading,
    conversationId,
    rateLimitInfo,
    sendMessage,
    abort,
    clearMessages,
    setConversationId,
    setMessages,
  };
}
