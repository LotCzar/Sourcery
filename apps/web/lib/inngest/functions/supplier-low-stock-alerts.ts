import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const supplierLowStockAlerts = inngest.createFunction(
  { id: "supplier-low-stock-alerts", name: "Supplier Low Stock Alerts" },
  { cron: "0 7 * * *" }, // Daily 7 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let alertsCreated = 0;

      for (const supplier of suppliers) {
        // Find products where stockQuantity <= reorderPoint
        const lowStockProducts = await prisma.supplierProduct.findMany({
          where: {
            supplierId: supplier.id,
            isActive: true,
            stockQuantity: { not: null },
            reorderPoint: { not: null },
          },
          select: {
            id: true,
            name: true,
            stockQuantity: true,
            reorderPoint: true,
          },
        });

        const actualLowStock = lowStockProducts.filter(
          (p) =>
            p.stockQuantity !== null &&
            p.reorderPoint !== null &&
            p.stockQuantity <= p.reorderPoint
        );

        // Find products expiring within 7 days
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const expiringProducts = await prisma.supplierProduct.findMany({
          where: {
            supplierId: supplier.id,
            isActive: true,
            expirationDate: {
              gte: now,
              lte: sevenDaysFromNow,
            },
          },
          select: {
            id: true,
            name: true,
            expirationDate: true,
          },
        });

        if (actualLowStock.length === 0 && expiringProducts.length === 0) continue;

        // Build summary
        const parts: string[] = [];
        if (actualLowStock.length > 0) {
          parts.push(
            `${actualLowStock.length} product${actualLowStock.length !== 1 ? "s" : ""} below reorder point: ${actualLowStock
              .slice(0, 3)
              .map((p) => p.name)
              .join(", ")}${actualLowStock.length > 3 ? ` and ${actualLowStock.length - 3} more` : ""}.`
          );
        }
        if (expiringProducts.length > 0) {
          parts.push(
            `${expiringProducts.length} product${expiringProducts.length !== 1 ? "s" : ""} expiring within 7 days: ${expiringProducts
              .slice(0, 3)
              .map((p) => p.name)
              .join(", ")}${expiringProducts.length > 3 ? ` and ${expiringProducts.length - 3} more` : ""}.`
          );
        }

        const summary = parts.join(" ");

        // Create insight
        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "LOW_STOCK",
            title: "Low Stock & Expiration Alert",
            summary,
            data: {
              lowStock: actualLowStock.map((p) => ({
                id: p.id,
                name: p.name,
                quantity: p.stockQuantity,
                reorderPoint: p.reorderPoint,
              })),
              expiring: expiringProducts.map((p) => ({
                id: p.id,
                name: p.name,
                expirationDate: p.expirationDate,
              })),
            },
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          },
        });

        // Notify supplier users
        const users = await prisma.user.findMany({
          where: { supplierId: supplier.id },
          select: { id: true },
        });

        for (const u of users) {
          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Low Stock Alert",
              message: summary,
              userId: u.id,
              metadata: {
                actionUrl: "/supplier/inventory",
                action: "view_inventory",
              },
            },
          });
        }

        alertsCreated++;
      }

      return { suppliersProcessed: suppliers.length, alertsCreated };
    } catch (err) {
      console.error("[supplier-low-stock-alerts] failed:", err);
      throw err;
    }
  }
);
