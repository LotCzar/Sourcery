"use client";

import { Sparkles } from "lucide-react";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";

interface Prompt {
  label: string;
  message: string;
  icon: React.ReactNode;
}

interface AiPromptChipsProps {
  prompts: Prompt[];
  className?: string;
}

export function AiPromptChips({ prompts, className }: AiPromptChipsProps) {
  const { openChatWithMessage } = useChat();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Ask AI:
      </span>
      {prompts.map((prompt) => (
        <button
          key={prompt.label}
          onClick={() => openChatWithMessage(prompt.message)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-primary/10"
        >
          {prompt.icon}
          {prompt.label}
        </button>
      ))}
    </div>
  );
}
