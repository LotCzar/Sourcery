import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const deliveryTracking = inngest.createFunction(
  { id: "delivery-tracking", name: "Overdue Delivery Monitor" },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find orders past their estimated delivery time
    const overdueOrders = await prisma.order.findMany({
      where: {
        status: { in: ["SHIPPED", "IN_TRANSIT"] },
        estimatedDeliveryAt: { lt: now },
      },
      include: {
        restaurant: { select: { id: true, name: true } },
        supplier: { select: { name: true } },
      },
    });

    let notificationsCreated = 0;

    for (const order of overdueOrders) {
      // Find the restaurant user to notify
      const restaurantUser = await prisma.user.findFirst({
        where: { restaurantId: order.restaurantId },
      });

      if (!restaurantUser) continue;

      // Check for recent notification to avoid spamming
      const recentNotification = await prisma.notification.findFirst({
        where: {
          userId: restaurantUser.id,
          type: "DELIVERY_UPDATE",
          createdAt: { gte: oneHourAgo },
          message: { contains: order.orderNumber },
          title: { contains: "Overdue" },
        },
      });

      if (recentNotification) continue;

      const minutesOverdue = Math.round(
        (now.getTime() - order.estimatedDeliveryAt!.getTime()) / (1000 * 60)
      );

      await prisma.notification.create({
        data: {
          type: "DELIVERY_UPDATE",
          title: "Delivery Overdue",
          message: `Order ${order.orderNumber} from ${order.supplier.name} is ${minutesOverdue} minutes past its estimated delivery time.`,
          userId: restaurantUser.id,
          metadata: {
            orderId: order.id,
            minutesOverdue,
          },
        },
      });

      notificationsCreated++;
    }

    return {
      overdueOrdersFound: overdueOrders.length,
      notificationsCreated,
    };
  }
);
