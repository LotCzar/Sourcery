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
  adjust_inventory: "Adjusting inventory",
  get_consumption_insights: "Analyzing consumption",
  reorder_item: "Reordering item",
  get_spending_summary: "Analyzing spending",
  generate_restock_list: "Generating restock list",
  check_invoice: "Checking invoice",
  calculate_menu_cost: "Calculating menu cost",
  recommend_supplier: "Finding supplier recommendations",
  optimize_par_levels: "Optimizing par levels",
  analyze_waste: "Analyzing waste",
  consolidate_orders: "Consolidating orders",
  get_supplier_performance: "Checking supplier performance",
  get_budget_forecast: "Forecasting budget",
  get_disputed_invoices: "Checking disputed invoices",
  get_seasonal_forecast: "Forecasting seasonal trends",
  find_substitutes: "Finding substitutes",
  get_price_trends: "Analyzing price trends",
  get_benchmarks: "Getting benchmarks",
  get_negotiation_brief: "Preparing negotiation brief",
  send_order_message: "Sending message",
  compare_restaurants: "Comparing restaurants",
  org_summary: "Getting organization summary",
  submit_order: "Submitting order",
  cancel_order: "Cancelling order",
  update_order_status: "Updating order status",
  get_menu_items: "Fetching menu items",
  mark_invoice_paid: "Marking invoice paid",
  add_inventory_item: "Adding inventory item",
  get_delivery_status: "Checking delivery status",
  duplicate_order: "Duplicating order",
  get_notifications: "Fetching notifications",
  mark_notifications_read: "Marking notifications read",
  schedule_order: "Scheduling order",
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
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
