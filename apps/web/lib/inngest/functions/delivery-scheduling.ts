import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const deliveryScheduling = inngest.createFunction(
  { id: "delivery-scheduling", name: "Smart Delivery Scheduling" },
  { cron: "0 9 * * *" }, // Daily 9 AM
  async () => {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
    });

    let totalSuggestions = 0;

    for (const restaurant of restaurants) {
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: "OWNER" },
      });

      if (!ownerUser) continue;

      // Find all DRAFT orders for this restaurant
      const draftOrders = await prisma.order.findMany({
        where: { restaurantId: restaurant.id, status: "DRAFT" },
        include: {
          supplier: { select: { id: true, name: true, deliveryFee: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });

      // Group drafts by supplier
      const supplierDrafts: Record<string, typeof draftOrders> = {};
      for (const order of draftOrders) {
        const sid = order.supplierId;
        if (!supplierDrafts[sid]) supplierDrafts[sid] = [];
        supplierDrafts[sid].push(order);
      }

      // Consolidation suggestions: 2+ DRAFTs for same supplier
      for (const [, orders] of Object.entries(supplierDrafts)) {
        if (orders.length < 2) continue;

        const deliveryFee = orders[0].supplier.deliveryFee
          ? Number(orders[0].supplier.deliveryFee)
          : 0;
        const potentialSavings = deliveryFee * (orders.length - 1);
        const totalItemCount = orders.reduce((sum, o) => sum + o.items.length, 0);
        const totalValue = orders.reduce((sum, o) => sum + Number(o.total), 0);

        await prisma.notification.create({
          data: {
            type: "DELIVERY_UPDATE",
            title: "Delivery Consolidation Suggestion",
            message: `You have ${orders.length} draft orders for ${orders[0].supplier.name}. Consolidating could save $${potentialSavings.toFixed(2)} in delivery fees.`,
            userId: ownerUser.id,
            metadata: {
              orderIds: orders.map((o) => o.id),
              orderNumbers: orders.map((o) => o.orderNumber),
              supplierName: orders[0].supplier.name,
              potentialSavings: Math.round(potentialSavings * 100) / 100,
              totalItemCount,
              totalValue: Math.round(totalValue * 100) / 100,
              actionUrl: "/orders",
            },
          },
        });

        totalSuggestions++;
      }

      // Add-to-upcoming: active order + DRAFT for same supplier
      const activeOrders = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] },
        },
        include: {
          supplier: { select: { id: true, name: true } },
        },
      });

      const activeSupplierIds = new Set(activeOrders.map((o) => o.supplierId));

      for (const [supplierId, drafts] of Object.entries(supplierDrafts)) {
        if (!activeSupplierIds.has(supplierId)) continue;

        const activeOrder = activeOrders.find((o) => o.supplierId === supplierId)!;
        const draftCount = drafts.length;

        await prisma.notification.create({
          data: {
            type: "DELIVERY_UPDATE",
            title: "Add Items to Upcoming Delivery",
            message: `You have ${draftCount} draft order(s) for ${activeOrder.supplier.name}, who already has an active order (${activeOrder.status}). Consider adding items to the upcoming delivery.`,
            userId: ownerUser.id,
            metadata: {
              activeOrderId: activeOrder.id,
              draftOrderIds: drafts.map((d) => d.id),
              supplierName: activeOrder.supplier.name,
              actionUrl: "/orders",
            },
          },
        });

        totalSuggestions++;
      }
    }

    return {
      restaurantsProcessed: restaurants.length,
      suggestions: totalSuggestions,
    };
  }
);
