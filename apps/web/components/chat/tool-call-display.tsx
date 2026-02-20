"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ActiveToolCall } from "@/hooks/use-chat-stream";

const toolLabels: Record<string, string> = {
  search_products: "Searching products",
  get_inventory: "Checking inventory",
  get_order_history: "Reviewing orders",
  create_draft_order: "Creating draft order",
  compare_prices: "Comparing prices",
  get_supplier_info: "Getting supplier info",
  create_price_alert: "Setting price alert",
};

interface ToolCallDisplayProps {
  toolCall: ActiveToolCall;
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = toolCall.status === "running";
  const label = toolLabels[toolCall.name] || toolCall.name;

  return (
    <div className="my-1 rounded-md border bg-card text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        <span className="flex-1 font-medium">{label}</span>
        <Badge variant={isRunning ? "info" : "success"} className="text-[10px]">
          {isRunning ? "Running" : "Done"}
        </Badge>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {expanded && toolCall.result && (
        <div className="border-t px-3 py-2">
          <pre
            className={cn(
              "max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground"
            )}
          >
            {typeof toolCall.result === "string"
              ? toolCall.result
              : JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
