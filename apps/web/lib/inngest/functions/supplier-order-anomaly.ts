import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const supplierOrderAnomaly = inngest.createFunction(
  { id: "supplier-order-anomaly", name: "Supplier Order Anomaly Detection" },
  { event: "order/status.changed" },
  async ({ event }) => {
    try {
      // Only check new PENDING orders
      if (event.data.newStatus !== "PENDING") return { skipped: true };

      const { orderId, supplierId, restaurantId } = event.data;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: { select: { name: true, category: true } } },
          },
          restaurant: { select: { name: true } },
        },
      });

      if (!order) return { error: "Order not found" };

      // Get customer's last 10 orders with this supplier
      const historicalOrders = await prisma.order.findMany({
        where: {
          supplierId,
          restaurantId,
          id: { not: orderId },
          status: { not: "CANCELLED" },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });

      if (historicalOrders.length < 3) {
        // Not enough history to detect anomalies
        return { skipped: true, reason: "Insufficient order history" };
      }

      const anomalies: string[] = [];

      // Check 1: Unusual order total (>2 std devs from mean)
      const historicalTotals = historicalOrders.map((o) => Number(o.total));
      const mean = historicalTotals.reduce((s, v) => s + v, 0) / historicalTotals.length;
      const variance = historicalTotals.reduce((s, v) => s + (v - mean) ** 2, 0) / historicalTotals.length;
      const stdDev = Math.sqrt(variance);
      const currentTotal = Number(order.total);

      if (stdDev > 0 && Math.abs(currentTotal - mean) > 2 * stdDev) {
        const direction = currentTotal > mean ? "larger" : "smaller";
        anomalies.push(
          `Order total ($${currentTotal.toFixed(2)}) is significantly ${direction} than average ($${mean.toFixed(2)}). ${Math.abs(((currentTotal - mean) / stdDev)).toFixed(1)} standard deviations from mean.`
        );
      }

      // Check 2: Unusual items (items never ordered before by this customer)
      const historicalProductNames = new Set<string>();
      for (const ho of historicalOrders) {
        for (const item of ho.items) {
          historicalProductNames.add(item.product.name);
        }
      }

      const newItems = order.items.filter(
        (item) => !historicalProductNames.has(item.product.name)
      );

      if (newItems.length > 0 && newItems.length >= order.items.length * 0.5) {
        anomalies.push(
          `${newItems.length} of ${order.items.length} items have never been ordered by this customer before: ${newItems.map((i) => i.product.name).slice(0, 3).join(", ")}${newItems.length > 3 ? ` and ${newItems.length - 3} more` : ""}.`
        );
      }

      // Check 3: Unusual timing (order on a day when customer doesn't usually order)
      const historicalDays = historicalOrders.map((o) => o.createdAt.getDay());
      const dayFreq: Record<number, number> = {};
      for (const d of historicalDays) {
        dayFreq[d] = (dayFreq[d] || 0) + 1;
      }
      const orderDay = order.createdAt.getDay();
      if (!dayFreq[orderDay] && historicalOrders.length >= 5) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const usualDays = Object.entries(dayFreq)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([d]) => dayNames[Number(d)]);
        anomalies.push(
          `Order placed on ${dayNames[orderDay]}, but this customer usually orders on ${usualDays.join(" and ")}.`
        );
      }

      if (anomalies.length === 0) {
        return { orderId, anomalies: 0 };
      }

      // Create anomaly insight
      await prisma.supplierInsight.create({
        data: {
          supplierId,
          type: "ANOMALY",
          title: `Unusual Order from ${order.restaurant.name}`,
          summary: anomalies.join(" "),
          data: {
            orderId,
            orderNumber: order.orderNumber,
            restaurantName: order.restaurant.name,
            restaurantId,
            orderTotal: currentTotal,
            historicalAvg: Math.round(mean * 100) / 100,
            anomalies,
          },
        },
      });

      // Notify supplier users
      const supplierUsers = await prisma.user.findMany({
        where: { supplierId },
        select: { id: true },
      });
      for (const su of supplierUsers) {
        await prisma.notification.create({
          data: {
            type: "ORDER_UPDATE",
            title: `Unusual Order from ${order.restaurant.name}`,
            message: anomalies[0],
            userId: su.id,
            metadata: {
              actionUrl: "/supplier/orders",
              action: "view_orders",
            },
          },
        });
      }

      return { orderId, anomalies: anomalies.length };
    } catch (err) {
      console.error("[supplier-order-anomaly] failed:", err);
      throw err;
    }
  }
);
