"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

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

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeToolCalls, setActiveToolCalls] = useState<ActiveToolCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async (message: string, existingConversationId?: string | null) => {
      setIsLoading(true);
      setActiveToolCalls([]);

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
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: existingConversationId || conversationId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json();
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
                    if (
                      data.name === "create_draft_order" ||
                      data.name === "reorder_item" ||
                      data.name === "generate_restock_list"
                    ) {
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.orders.all,
                      });
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.dashboard.all,
                      });
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.inventory.all,
                      });
                    }
                    if (data.name === "adjust_inventory") {
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.inventory.all,
                      });
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.inventory.insights,
                      });
                    }
                    if (data.name === "create_price_alert") {
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.priceAlerts.all,
                      });
                    }
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
        abortRef.current = null;
      }
    },
    [conversationId, queryClient]
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
    sendMessage,
    abort,
    clearMessages,
    setConversationId,
    setMessages,
  };
}
