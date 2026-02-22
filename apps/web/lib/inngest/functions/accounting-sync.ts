import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { getAccountingService } from "@/lib/accounting";

// Triggered when an invoice status changes to PAID
export const accountingInvoiceSync = inngest.createFunction(
  { id: "accounting-invoice-sync", name: "Sync Invoice to Accounting on Payment" },
  { event: "invoice/status.changed" },
  async ({ event }) => {
    const { invoiceId, newStatus, restaurantId } = event.data;

    if (newStatus !== "PAID") {
      return { action: "skipped", reason: "not_paid_status" };
    }

    const integration = await prisma.accountingIntegration.findUnique({
      where: { restaurantId },
    });

    if (!integration || !integration.isActive) {
      return { action: "skipped", reason: "no_active_integration" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        supplier: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    if (!invoice) {
      return { action: "skipped", reason: "invoice_not_found" };
    }

    if (invoice.syncStatus === "SYNCED") {
      return { action: "skipped", reason: "already_synced" };
    }

    try {
      const service = getAccountingService(integration.provider);

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { syncStatus: "PENDING" },
      });

      const result = await service.syncInvoice(invoice, integration);

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          syncStatus: "SYNCED",
          externalId: result.externalId,
          lastSyncError: null,
        },
      });

      await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });

      return {
        action: "synced",
        invoiceId,
        externalId: result.externalId,
      };
    } catch (err: any) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          syncStatus: "FAILED",
          lastSyncError: err?.message || "Unknown error",
        },
      });

      return {
        action: "failed",
        invoiceId,
        error: err?.message,
      };
    }
  }
);

// Daily batch sync for NOT_SYNCED invoices
export const accountingBatchSync = inngest.createFunction(
  { id: "accounting-batch-sync", name: "Daily Accounting Batch Sync" },
  { cron: "0 2 * * *" }, // Daily at 2am
  async () => {
    // Find all restaurants with active accounting integrations
    const integrations = await prisma.accountingIntegration.findMany({
      where: { isActive: true },
    });

    let totalSynced = 0;
    let totalFailed = 0;

    for (const integration of integrations) {
      const invoices = await prisma.invoice.findMany({
        where: {
          restaurantId: integration.restaurantId,
          syncStatus: "NOT_SYNCED",
        },
        include: {
          supplier: { select: { name: true } },
          order: { select: { orderNumber: true } },
        },
      });

      if (invoices.length === 0) continue;

      const service = getAccountingService(integration.provider);

      for (const invoice of invoices) {
        try {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { syncStatus: "PENDING" },
          });

          const result = await service.syncInvoice(invoice, integration);

          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              syncStatus: "SYNCED",
              externalId: result.externalId,
              lastSyncError: null,
            },
          });

          totalSynced++;
        } catch (err: any) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              syncStatus: "FAILED",
              lastSyncError: err?.message || "Unknown error",
            },
          });
          totalFailed++;
        }
      }

      // Update last sync time
      await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });
    }

    return {
      action: "batch_sync_complete",
      integrationsProcessed: integrations.length,
      totalSynced,
      totalFailed,
    };
  }
);
