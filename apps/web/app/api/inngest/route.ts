import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  autoReorder,
  priceMonitor,
  supplierFollowup,
  invoiceGenerator,
  consumptionAnalysis,
  menuSync,
  orderAnomaly,
  proactiveOrdering,
  invoiceReminders,
  weeklyDigest,
  inventoryReconciliation,
  deliveryScheduling,
  supplierPerformance,
  budgetAlerts,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [autoReorder, priceMonitor, supplierFollowup, invoiceGenerator, consumptionAnalysis, menuSync, orderAnomaly, proactiveOrdering, invoiceReminders, weeklyDigest, inventoryReconciliation, deliveryScheduling, supplierPerformance, budgetAlerts],
});
