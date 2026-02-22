import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const inventoryReconciliation = inngest.createFunction(
  { id: "inventory-reconciliation", name: "Auto-Reconcile Inventory on Delivery" },
  { event: "order/delivered" },
  async ({ event }) => {
    const { orderId, restaurantId } = event.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        supplier: { select: { name: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });

    if (!order) {
      return { action: "skipped", reason: "order_not_found" };
    }

    const ownerUser = await prisma.user.findFirst({
      where: { restaurantId, role: "OWNER" },
    });

    if (!ownerUser) {
      return { action: "skipped", reason: "no_owner" };
    }

    const reconciledItems: Array<{ name: string; added: number; newQuantity: number }> = [];
    const skippedItems: Array<{ name: string; reason: string }> = [];

    for (const orderItem of order.items) {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          restaurantId,
          supplierProductId: orderItem.productId,
        },
      });

      if (!inventoryItem) {
        skippedItems.push({
          name: orderItem.product.name,
          reason: "no_matching_inventory_item",
        });
        continue;
      }

      const currentQuantity = Number(inventoryItem.currentQuantity);
      const addedQuantity = Number(orderItem.quantity);
      const newQuantity = currentQuantity + addedQuantity;

      await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { currentQuantity: newQuantity },
      });

      await prisma.inventoryLog.create({
        data: {
          inventoryItemId: inventoryItem.id,
          changeType: "RECEIVED",
          quantity: addedQuantity,
          previousQuantity: currentQuantity,
          newQuantity,
          reference: orderId,
          createdById: ownerUser.id,
        },
      });

      reconciledItems.push({
        name: orderItem.product.name,
        added: addedQuantity,
        newQuantity,
      });
    }

    await prisma.notification.create({
      data: {
        type: "DELIVERY_UPDATE",
        title: "Inventory Reconciled",
        message: `Order ${order.orderNumber} from ${order.supplier.name}: ${reconciledItems.length} item(s) updated, ${skippedItems.length} skipped.`,
        userId: ownerUser.id,
        metadata: {
          orderId,
          orderNumber: order.orderNumber,
          supplierName: order.supplier.name,
          reconciled: reconciledItems.length,
          skipped: skippedItems.length,
          reconciledItems,
          skippedItems,
          actionUrl: "/inventory",
        },
      },
    });

    return {
      action: "reconciled",
      reconciled: reconciledItems.length,
      skipped: skippedItems.length,
    };
  }
);
