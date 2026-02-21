import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const orderAnomaly = inngest.createFunction(
  { id: "order-anomaly", name: "Order Anomaly Detection" },
  { event: "order/status.changed" },
  async ({ event }) => {
    const { orderId, newStatus, restaurantId } = event.data;

    // Only check anomalies on new pending orders
    if (newStatus !== "PENDING") {
      return { action: "skipped", reason: "not_pending" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });

    if (!order) return { action: "skipped", reason: "order_not_found" };

    const anomalies: { type: string; message: string; details: any }[] = [];

    // 1. Spend anomaly: compare order total against avg of last 20 delivered orders from same supplier
    const pastOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        supplierId: order.supplierId,
        status: "DELIVERED",
        id: { not: orderId },
      },
      select: { total: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (pastOrders.length >= 3) {
      const avgTotal =
        pastOrders.reduce((sum, o) => sum + Number(o.total), 0) /
        pastOrders.length;
      const orderTotal = Number(order.total);
      const percentAbove = ((orderTotal - avgTotal) / avgTotal) * 100;

      if (percentAbove > 50) {
        anomalies.push({
          type: "SPEND_ANOMALY",
          message: `Order total ($${orderTotal.toFixed(2)}) is ${Math.round(percentAbove)}% above the average ($${avgTotal.toFixed(2)}) for ${order.supplier.name}.`,
          details: {
            orderTotal,
            avgTotal: Math.round(avgTotal * 100) / 100,
            percentAbove: Math.round(percentAbove),
          },
        });
      }
    }

    // 2. Quantity anomaly: for each item, compare against avg of last 10 orders with same product
    for (const item of order.items) {
      const pastItems = await prisma.orderItem.findMany({
        where: {
          productId: item.productId,
          order: {
            restaurantId,
            status: "DELIVERED",
            id: { not: orderId },
          },
        },
        select: { quantity: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (pastItems.length >= 3) {
        const avgQty =
          pastItems.reduce((sum, i) => sum + Number(i.quantity), 0) /
          pastItems.length;
        const itemQty = Number(item.quantity);

        if (itemQty > avgQty * 3) {
          anomalies.push({
            type: "QUANTITY_ANOMALY",
            message: `${item.product.name}: quantity ${itemQty} is ${Math.round(itemQty / avgQty)}x the average (${Math.round(avgQty * 10) / 10}).`,
            details: {
              product: item.product.name,
              quantity: itemQty,
              avgQuantity: Math.round(avgQty * 10) / 10,
              multiplier: Math.round((itemQty / avgQty) * 10) / 10,
            },
          });
        }
      }
    }

    if (anomalies.length === 0) {
      return { action: "no_anomalies" };
    }

    // Find restaurant owner for notification
    const ownerUser = await prisma.user.findFirst({
      where: { restaurantId, role: "OWNER" },
    });

    if (ownerUser) {
      const anomalyMessages = anomalies.map((a) => a.message).join(" ");
      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: "Order Anomaly Detected",
          message: `Order ${order.orderNumber}: ${anomalyMessages}`,
          userId: ownerUser.id,
          metadata: {
            orderId,
            orderNumber: order.orderNumber,
            anomalies,
            action: "view_orders",
            actionUrl: "/orders",
          },
        },
      });
    }

    return {
      action: "anomalies_detected",
      anomalyCount: anomalies.length,
      anomalies,
    };
  }
);
