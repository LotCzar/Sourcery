import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const supplierDeliveryDigest = inngest.createFunction(
  { id: "supplier-delivery-digest", name: "Supplier Delivery Performance Digest" },
  { cron: "0 20 * * *" }, // Daily 8 PM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Get today's delivered orders
        const deliveredOrders = await prisma.order.findMany({
          where: {
            supplierId: supplier.id,
            status: "DELIVERED",
            deliveredAt: { gte: todayStart, lte: todayEnd },
          },
          select: {
            id: true,
            deliveryDate: true,
            deliveredAt: true,
            shippedAt: true,
            driverId: true,
            restaurant: { select: { name: true } },
          },
        });

        // Also get orders that were supposed to be delivered today but weren't
        const pendingDeliveries = await prisma.order.findMany({
          where: {
            supplierId: supplier.id,
            status: { in: ["SHIPPED", "IN_TRANSIT", "PROCESSING", "CONFIRMED"] },
            deliveryDate: { gte: todayStart, lte: todayEnd },
          },
          select: {
            id: true,
            status: true,
            deliveryDate: true,
            driverId: true,
            restaurant: { select: { name: true } },
          },
        });

        const totalAttempted = deliveredOrders.length + pendingDeliveries.length;
        if (totalAttempted === 0) continue;

        // Calculate on-time delivery
        let onTimeCount = 0;
        let totalDelayMinutes = 0;
        let delaysCount = 0;

        for (const order of deliveredOrders) {
          if (order.deliveryDate && order.deliveredAt) {
            const deadline = new Date(order.deliveryDate);
            deadline.setHours(23, 59, 59, 999);
            if (order.deliveredAt <= deadline) {
              onTimeCount++;
            } else {
              const delayMs = order.deliveredAt.getTime() - deadline.getTime();
              totalDelayMinutes += delayMs / (1000 * 60);
              delaysCount++;
            }
          } else {
            onTimeCount++; // No deadline set, count as on-time
          }
        }

        // Per-driver breakdown
        const driverStats: Record<string, {
          driverId: string;
          deliveries: number;
          onTime: number;
          totalMinutes: number;
          deliveriesWithTime: number;
        }> = {};

        for (const order of deliveredOrders) {
          const driverId = order.driverId || "unassigned";
          if (!driverStats[driverId]) {
            driverStats[driverId] = {
              driverId,
              deliveries: 0,
              onTime: 0,
              totalMinutes: 0,
              deliveriesWithTime: 0,
            };
          }
          driverStats[driverId].deliveries++;

          if (order.deliveryDate && order.deliveredAt) {
            const deadline = new Date(order.deliveryDate);
            deadline.setHours(23, 59, 59, 999);
            if (order.deliveredAt <= deadline) {
              driverStats[driverId].onTime++;
            }
          } else {
            driverStats[driverId].onTime++;
          }

          if (order.shippedAt && order.deliveredAt) {
            const minutes = (order.deliveredAt.getTime() - order.shippedAt.getTime()) / (1000 * 60);
            driverStats[driverId].totalMinutes += minutes;
            driverStats[driverId].deliveriesWithTime++;
          }
        }

        // Resolve driver names
        const driverIds = Object.keys(driverStats).filter((id) => id !== "unassigned");
        const drivers = driverIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: driverIds } },
              select: { id: true, firstName: true, lastName: true },
            })
          : [];
        const driverNameMap = new Map(
          drivers.map((d) => [d.id, `${d.firstName || ""} ${d.lastName || ""}`.trim()])
        );

        const driverBreakdown = Object.values(driverStats).map((d) => ({
          driverId: d.driverId,
          driverName: d.driverId === "unassigned" ? "Unassigned" : (driverNameMap.get(d.driverId) || "Unknown"),
          deliveries: d.deliveries,
          onTimeRate: d.deliveries > 0 ? Math.round((d.onTime / d.deliveries) * 100) : 0,
          avgDeliveryMinutes: d.deliveriesWithTime > 0
            ? Math.round(d.totalMinutes / d.deliveriesWithTime)
            : null,
          belowThreshold: d.deliveries >= 3 && (d.onTime / d.deliveries) < 0.8,
        }));

        const flaggedDrivers = driverBreakdown.filter((d) => d.belowThreshold);

        const onTimeRate = totalAttempted > 0
          ? Math.round((onTimeCount / totalAttempted) * 100)
          : 0;
        const avgDelay = delaysCount > 0
          ? Math.round(totalDelayMinutes / delaysCount)
          : 0;

        const summary = `Today's delivery report: ${deliveredOrders.length}/${totalAttempted} on time (${onTimeRate}%).${avgDelay > 0 ? ` Avg delay: ${avgDelay} min.` : ""}${flaggedDrivers.length > 0 ? ` ${flaggedDrivers.length} driver${flaggedDrivers.length !== 1 ? "s" : ""} below 80% on-time threshold.` : ""}${pendingDeliveries.length > 0 ? ` ${pendingDeliveries.length} delivery${pendingDeliveries.length !== 1 ? "ies" : "y"} still pending.` : ""}`;

        // Expire old insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "DELIVERY_PERFORMANCE",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "DELIVERY_PERFORMANCE",
            title: "Daily Delivery Digest",
            summary,
            data: {
              totalAttempted,
              delivered: deliveredOrders.length,
              onTimeCount,
              onTimeRate,
              avgDelayMinutes: avgDelay,
              pendingCount: pendingDeliveries.length,
              driverBreakdown,
              flaggedDrivers: flaggedDrivers.map((d) => d.driverName),
            },
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          },
        });

        // Notify
        const users = await prisma.user.findMany({
          where: { supplierId: supplier.id },
          select: { id: true },
        });
        for (const user of users) {
          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Daily Delivery Report",
              message: `Today's delivery report: ${deliveredOrders.length}/${totalAttempted} on time (${onTimeRate}%)`,
              userId: user.id,
              metadata: {
                actionUrl: "/supplier/insights",
                action: "view_insights",
              },
            },
          });
        }

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-delivery-digest] failed:", err);
      throw err;
    }
  }
);
