import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const proactiveOrdering = inngest.createFunction(
  { id: "proactive-ordering", name: "Proactive Ordering Autopilot" },
  { cron: "0 7 * * *" }, // Daily 7 AM (after consumption-analysis at 6 AM)
  async () => {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
    });

    let totalOrders = 0;

    for (const restaurant of restaurants) {
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: "OWNER" },
      });

      if (!ownerUser) continue;

      const items = await prisma.inventoryItem.findMany({
        where: { restaurantId: restaurant.id },
        include: {
          consumptionInsights: {
            where: { restaurantId: restaurant.id },
            take: 1,
          },
          supplierProduct: {
            include: { supplier: true },
          },
        },
      });

      // Group items needing proactive ordering by supplier
      const supplierGroups: Record<
        string,
        {
          supplier: any;
          items: Array<{
            item: any;
            insight: any;
            reorderQuantity: number;
            reason: string;
          }>;
        }
      > = {};

      for (const item of items) {
        if (!item.supplierProduct) continue;

        const supplier = item.supplierProduct.supplier;
        const insight = item.consumptionInsights[0];
        const currentQty = Number(item.currentQuantity);
        const parLevel = item.parLevel ? Number(item.parLevel) : 0;

        let needsOrder = false;
        let reorderQuantity: number;
        let reason: string;

        if (insight) {
          const daysUntilStockout = insight.daysUntilStockout
            ? Number(insight.daysUntilStockout)
            : null;
          const leadTimeDays = supplier.leadTimeDays || 2;

          if (
            daysUntilStockout !== null &&
            daysUntilStockout <= leadTimeDays + 1
          ) {
            needsOrder = true;
            const avgWeeklyUsage = Number(insight.avgWeeklyUsage);
            const suggestedPar = insight.suggestedParLevel
              ? Number(insight.suggestedParLevel)
              : parLevel;
            reorderQuantity = Math.max(
              avgWeeklyUsage * 2 - currentQty,
              suggestedPar - currentQty
            );
            reason = `${item.name}: ~${Math.round(daysUntilStockout)} days until stockout (lead time: ${leadTimeDays} days)`;
          }
        }

        if (!needsOrder && parLevel > 0 && currentQty < parLevel * 0.5) {
          needsOrder = true;
          reorderQuantity = parLevel - currentQty;
          reason = `${item.name}: critically low at ${currentQty}/${parLevel} ${item.unit}`;
        }

        if (needsOrder) {
          const sid = supplier.id;
          if (!supplierGroups[sid]) {
            supplierGroups[sid] = { supplier, items: [] };
          }
          supplierGroups[sid].items.push({
            item,
            insight,
            reorderQuantity: Math.ceil(reorderQuantity!),
            reason: reason!,
          });
        }
      }

      // Create draft orders per supplier
      for (const [, group] of Object.entries(supplierGroups)) {
        const { supplier, items: groupItems } = group;

        let subtotal = 0;
        const orderItemsData = groupItems.map((gi) => {
          const unitPrice = Number(gi.item.supplierProduct.price);
          const itemSubtotal = gi.reorderQuantity * unitPrice;
          subtotal += itemSubtotal;
          return {
            productId: gi.item.supplierProduct.id,
            quantity: gi.reorderQuantity,
            unitPrice,
            subtotal: itemSubtotal,
          };
        });

        const taxRate = 0.0825;
        const tax = subtotal * taxRate;
        const deliveryFee = supplier.deliveryFee
          ? Number(supplier.deliveryFee)
          : 0;
        const total = subtotal + tax + deliveryFee;

        const orderCount = await prisma.order.count({
          where: { restaurantId: restaurant.id },
        });
        const orderNumber = `ORD-${String(orderCount + 1).padStart(5, "0")}`;

        const belowMinimumOrder =
          supplier.minimumOrder && subtotal < Number(supplier.minimumOrder);

        const order = await prisma.order.create({
          data: {
            orderNumber,
            status: "DRAFT",
            restaurantId: restaurant.id,
            supplierId: supplier.id,
            createdById: ownerUser.id,
            subtotal,
            tax,
            deliveryFee,
            total,
            deliveryNotes: `Proactive order: ${groupItems.length} item(s) approaching stockout`,
            items: { create: orderItemsData },
          },
        });

        const reasons = groupItems.map((gi) => gi.reason);

        await prisma.notification.create({
          data: {
            type: "ORDER_UPDATE",
            title: "Proactive Order Created",
            message: `Draft order ${orderNumber} for ${groupItems.length} item(s) from ${supplier.name} ($${total.toFixed(2)}). Review and submit when ready.`,
            userId: ownerUser.id,
            metadata: {
              orderId: order.id,
              action: "review_order",
              actionUrl: "/orders",
              reasons,
              belowMinimumOrder: !!belowMinimumOrder,
              estimatedCost: Math.round(total * 100) / 100,
              supplierName: supplier.name,
            },
          },
        });

        totalOrders++;
      }
    }

    return {
      restaurantsProcessed: restaurants.length,
      ordersCreated: totalOrders,
    };
  }
);
