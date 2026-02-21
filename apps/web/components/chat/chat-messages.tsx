"use client";

import { useEffect, useRef } from "react";
import { ChatMessageBubble } from "./chat-message";
import { ToolCallDisplay } from "./tool-call-display";
import type { ChatMessage, ActiveToolCall } from "@/hooks/use-chat-stream";

interface ChatMessagesProps {
  messages: ChatMessage[];
  activeToolCalls: ActiveToolCall[];
}

export function ChatMessages({ messages, activeToolCalls }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeToolCalls]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="rounded-full bg-primary/10 p-3">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
        </div>
        <h3 className="font-semibold">Heard AI</h3>
        <p className="text-sm text-muted-foreground">
          Ask me about products, orders, inventory, or suppliers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {activeToolCalls.length > 0 && (
          <div className="ml-11 space-y-1">
            {activeToolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
