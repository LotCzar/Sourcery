"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useOrderMessages, useSendMessage } from "@/hooks/use-messages";

interface OrderMessagesProps {
  orderId: string;
}

export function OrderMessages({ orderId }: OrderMessagesProps) {
  const { data: result, isLoading } = useOrderMessages(orderId);
  const sendMessage = useSendMessage(orderId);
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = result?.data ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate(
      { content: content.trim() },
      {
        onSuccess: () => setContent(""),
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        className="max-h-[200px] overflow-y-auto space-y-2 rounded-lg border p-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} className="rounded-md bg-muted/50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {msg.sender?.firstName || "Unknown"}{" "}
                  {msg.sender?.lastName || ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm">{msg.content}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sendMessage.isPending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || sendMessage.isPending}
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
