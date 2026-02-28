import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const supplierRouteOptimizer = inngest.createFunction(
  { id: "supplier-route-optimizer", name: "Supplier Route Optimizer" },
  { cron: "0 5 * * *" }, // Daily 5 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        // Get confirmed/processing orders for tomorrow
        const orders = await prisma.order.findMany({
          where: {
            supplierId: supplier.id,
            status: { in: ["CONFIRMED", "PROCESSING"] },
            deliveryDate: { gte: tomorrow, lt: dayAfter },
          },
          include: {
            restaurant: {
              select: { id: true, name: true, address: true, city: true, zipCode: true },
            },
            items: { select: { quantity: true } },
          },
        });

        if (orders.length < 2) continue;

        // Group orders by delivery zone (city/zip prefix)
        const zones: Record<string, typeof orders> = {};
        for (const order of orders) {
          const zone = order.restaurant.zipCode
            ? order.restaurant.zipCode.substring(0, 3)
            : order.restaurant.city || "unknown";
          if (!zones[zone]) zones[zone] = [];
          zones[zone].push(order);
        }

        // Nearest-neighbor heuristic for each zone
        const routeSuggestions = Object.entries(zones).map(([zone, zoneOrders]) => {
          // Simple nearest-neighbor: start from first, pick closest next
          const sequence: string[] = [];
          const remaining = [...zoneOrders];

          let current = remaining.shift()!;
          sequence.push(current.restaurant.name);

          while (remaining.length > 0) {
            // Use zip code proximity as distance proxy
            let nearestIdx = 0;
            let nearestDist = Infinity;
            for (let i = 0; i < remaining.length; i++) {
              const dist = Math.abs(
                parseInt(remaining[i].restaurant.zipCode || "0") -
                parseInt(current.restaurant.zipCode || "0")
              );
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
              }
            }
            current = remaining.splice(nearestIdx, 1)[0];
            sequence.push(current.restaurant.name);
          }

          return {
            zone,
            deliveryCount: zoneOrders.length,
            suggestedSequence: sequence,
            addresses: zoneOrders.map((o) => ({
              restaurant: o.restaurant.name,
              address: o.restaurant.address,
              city: o.restaurant.city,
              zip: o.restaurant.zipCode,
              itemCount: o.items.length,
            })),
          };
        });

        const totalDeliveries = orders.length;
        const consolidatedTrips = Object.keys(zones).length;

        const summary = `${totalDeliveries} deliveries tomorrow across ${consolidatedTrips} zone${consolidatedTrips !== 1 ? "s" : ""}. ${consolidatedTrips < totalDeliveries ? `Consolidating into ${consolidatedTrips} route${consolidatedTrips !== 1 ? "s" : ""} saves ${totalDeliveries - consolidatedTrips} individual trips.` : "Each delivery in a separate zone."}`;

        // Expire old route insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "ROUTE_OPTIMIZATION",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "ROUTE_OPTIMIZATION",
            title: "Optimized Delivery Routes",
            summary,
            data: {
              deliveryDate: tomorrow.toISOString(),
              totalDeliveries,
              consolidatedTrips,
              routes: routeSuggestions,
            },
            expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
          },
        });

        // Notify supplier users
        const users = await prisma.user.findMany({
          where: { supplierId: supplier.id },
          select: { id: true },
        });
        for (const user of users) {
          await prisma.notification.create({
            data: {
              type: "SYSTEM",
              title: "Delivery Routes Optimized",
              message: `Optimized delivery routes ready for ${totalDeliveries} deliveries tomorrow`,
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
      console.error("[supplier-route-optimizer] failed:", err);
      throw err;
    }
  }
);
