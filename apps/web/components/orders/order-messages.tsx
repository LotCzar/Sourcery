"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Loader2, Lock } from "lucide-react";
import { useOrderMessages, useSendMessage } from "@/hooks/use-messages";

interface OrderMessagesProps {
  orderId: string;
  isSupplierUser?: boolean;
}

export function OrderMessages({ orderId, isSupplierUser = false }: OrderMessagesProps) {
  const { data: result, isLoading } = useOrderMessages(orderId);
  const sendMessage = useSendMessage(orderId);
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = result?.data || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      await sendMessage.mutateAsync({
        content: content.trim(),
        isInternal: isInternal && !isSupplierUser ? true : undefined,
      });
      setContent("");
      setIsInternal(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
          {messages.length > 0 && (
            <Badge variant="secondary">{messages.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Thread */}
        <div className="max-h-[400px] overflow-y-auto space-y-3 rounded-lg border p-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No messages yet. Start the conversation below.
            </p>
          ) : (
            messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${
                  msg.isInternal
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{msg.sender.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {msg.sender.role === "SUPPLIER_ADMIN" || msg.sender.role === "SUPPLIER_REP"
                      ? "Supplier"
                      : msg.sender.role.charAt(0) + msg.sender.role.slice(1).toLowerCase()}
                  </Badge>
                  {msg.isInternal && (
                    <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                      <Lock className="mr-1 h-3 w-3" />
                      Internal
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <div>
              {!isSupplierUser && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={(checked) => setIsInternal(checked === true)}
                  />
                  <Label htmlFor="internal" className="text-sm text-muted-foreground">
                    Internal note (not visible to supplier)
                  </Label>
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!content.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
