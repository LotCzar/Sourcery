import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const autoReorder = inngest.createFunction(
  { id: "auto-reorder", name: "Auto Reorder Low Stock" },
  { event: "inventory/below.par" },
  async ({ event }) => {
    const { inventoryItemId, restaurantId, itemName, currentQuantity, parLevel } =
      event.data;

    // Find the restaurant owner
    const ownerUser = await prisma.user.findFirst({
      where: { restaurantId, role: "OWNER" },
    });

    // Find the inventory item with its linked supplier product
    const item = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: {
        supplierProduct: {
          include: {
            supplier: true,
          },
        },
      },
    });

    if (!item?.supplierProduct) {
      // No linked supplier product, just create a notification
      if (ownerUser) {
        await prisma.notification.create({
          data: {
            type: "PRICE_ALERT",
            title: "Low Stock Alert",
            message: `${itemName} is below par level (${currentQuantity}/${parLevel}). No supplier product linked for auto-reorder.`,
            userId: ownerUser.id,
          },
        });
      }
      return { action: "notified", reason: "no_supplier_product" };
    }

    if (!ownerUser) {
      return { action: "skipped", reason: "no_owner_user" };
    }

    const supplier = item.supplierProduct.supplier;

    // Check for consumption insights to calculate smarter reorder quantity
    const insight = await prisma.consumptionInsight.findUnique({
      where: {
        restaurantId_inventoryItemId: {
          restaurantId,
          inventoryItemId,
        },
      },
    });

    let reorderQuantity: number;
    if (insight) {
      const avgWeeklyUsage = Number(insight.avgWeeklyUsage);
      const insightParLevel = insight.suggestedParLevel
        ? Number(insight.suggestedParLevel)
        : parLevel;
      reorderQuantity = Math.max(
        avgWeeklyUsage * 2 - currentQuantity,
        insightParLevel - currentQuantity
      );
    } else {
      reorderQuantity = parLevel - currentQuantity;
    }
    const unitPrice = Number(item.supplierProduct.price);
    const subtotal = reorderQuantity * unitPrice;
    const taxRate = 0.0825;
    const tax = subtotal * taxRate;
    const deliveryFee = supplier.deliveryFee ? Number(supplier.deliveryFee) : 0;
    const total = subtotal + tax + deliveryFee;

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { restaurantId },
    });
    const orderNumber = `ORD-${String(orderCount + 1).padStart(5, "0")}`;

    // Create draft order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: "DRAFT",
        restaurantId,
        supplierId: supplier.id,
        createdById: ownerUser.id,
        subtotal,
        tax,
        deliveryFee,
        total,
        deliveryNotes: `Auto-generated: ${itemName} below par level (${currentQuantity}/${parLevel})`,
        items: {
          create: [
            {
              productId: item.supplierProduct.id,
              quantity: reorderQuantity,
              unitPrice,
              subtotal,
            },
          ],
        },
      },
    });

    // Notify the restaurant owner
    await prisma.notification.create({
      data: {
        type: "ORDER_UPDATE",
        title: "Auto-Reorder Created",
        message: `Draft order ${orderNumber} created for ${reorderQuantity} ${item.unit} of ${itemName} from ${supplier.name}. Please review and submit.`,
        userId: ownerUser.id,
        metadata: {
          orderId: order.id,
          action: "review_order",
          actionUrl: "/orders",
          estimatedCost: Math.round(total * 100) / 100,
          reorderQuantity,
          supplierName: supplier.name,
        },
      },
    });

    return { action: "draft_order_created", orderId: order.id, orderNumber };
  }
);
