import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAccountingService } from "@/lib/accounting";
import { AccountingSyncSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// POST - Sync invoices to accounting system
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const integration = await prisma.accountingIntegration.findUnique({
      where: { restaurantId: user.restaurant.id },
    });

    if (!integration || !integration.isActive) {
      return NextResponse.json({ error: "No active accounting integration" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(AccountingSyncSchema, body);
    if (!validation.success) return validation.response;
    const invoiceIds = validation.data.invoiceIds;

    // Find invoices to sync
    const whereClause: any = {
      restaurantId: user.restaurant.id,
    };

    if (invoiceIds && invoiceIds.length > 0) {
      whereClause.id = { in: invoiceIds };
    } else {
      whereClause.syncStatus = "NOT_SYNCED";
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        supplier: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    const service = getAccountingService(integration.provider);
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

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

        syncedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Invoice ${invoice.invoiceNumber}: sync failed`);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            syncStatus: "FAILED",
            lastSyncError: err?.message || "Unknown error",
          },
        });
      }
    }

    // Update last sync time
    await prisma.accountingIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedCount,
        failedCount,
        totalProcessed: invoices.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Invoice sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync invoices" },
      { status: 500 }
    );
  }
}
