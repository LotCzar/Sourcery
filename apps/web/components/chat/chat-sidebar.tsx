"use client";

import { useEffect, useCallback } from "react";
import { MessageSquarePlus, Trash2, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChat } from "@/lib/chat-context";
import { useChatStream } from "@/hooks/use-chat-stream";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

interface ConversationItem {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export function ChatSidebar() {
  const { isOpen, closeChat, currentConversationId, setCurrentConversationId } =
    useChat();
  const {
    messages,
    activeToolCalls,
    isLoading,
    conversationId,
    sendMessage,
    abort,
    clearMessages,
    setConversationId,
    setMessages,
  } = useChatStream();
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: () =>
      apiFetch<{ data: ConversationItem[] }>("/api/ai/conversations"),
    enabled: isOpen,
  });

  const deleteConversation = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/api/ai/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });

  // Sync conversationId from stream hook to context
  useEffect(() => {
    if (conversationId) {
      setCurrentConversationId(conversationId);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    }
  }, [conversationId, setCurrentConversationId, queryClient]);

  const handleNewChat = useCallback(() => {
    clearMessages();
    setCurrentConversationId(null);
  }, [clearMessages, setCurrentConversationId]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      clearMessages();
      setConversationId(id);
      setCurrentConversationId(id);
      // Load conversation messages
      apiFetch<{ data: ConversationItem }>(`/api/ai/conversations/${id}`)
        .catch(() => {
          // If fetching individual conversation fails, just start fresh with the ID
        });
    },
    [clearMessages, setConversationId, setCurrentConversationId]
  );

  const handleDeleteConversation = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteConversation.mutate(id);
      if (currentConversationId === id) {
        handleNewChat();
      }
    },
    [deleteConversation, currentConversationId, handleNewChat]
  );

  const handleSend = useCallback(
    (message: string) => {
      sendMessage(message, currentConversationId);
    },
    [sendMessage, currentConversationId]
  );

  const showHistory = messages.length === 0 && !isLoading;
  const conversationList = conversations?.data || [];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeChat()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Heard AI</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="h-8 gap-1.5"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New
            </Button>
          </div>
          <SheetDescription className="sr-only">
            AI assistant for managing your restaurant procurement
          </SheetDescription>
        </SheetHeader>

        {showHistory && conversationList.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
              <History className="h-3 w-3" />
              Recent conversations
            </div>
            <div className="space-y-0.5 px-2">
              {conversationList.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="flex-1 truncate">{conv.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {conv.messageCount} msgs
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="hidden shrink-0 rounded p-1 hover:bg-destructive/10 hover:text-destructive group-hover:block"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            activeToolCalls={activeToolCalls}
          />
        )}

        <ChatInput onSend={handleSend} onAbort={abort} isLoading={isLoading} />
      </SheetContent>
    </Sheet>
  );
}
