import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const supplierFollowup = inngest.createFunction(
  { id: "supplier-followup", name: "Supplier Order Follow-up" },
  { event: "order/status.changed" },
  async ({ event, step }) => {
    // Only follow up on orders that became PENDING
    if (event.data.newStatus !== "PENDING") {
      return { action: "skipped", reason: "not_pending" };
    }

    // Wait 48 hours
    await step.sleep("wait-48h", "48h");

    // Check if the order is still pending
    const order = await step.run("check-order-status", async () => {
      return prisma.order.findUnique({
        where: { id: event.data.orderId },
        include: {
          supplier: true,
          restaurant: true,
        },
      });
    });

    if (!order || order.status !== "PENDING") {
      return { action: "skipped", reason: "no_longer_pending" };
    }

    // Send reminder email to supplier
    await step.run("send-reminder", async () => {
      if (order.supplier.email) {
        await sendEmail({
          to: order.supplier.email,
          subject: `Reminder: Order ${order.orderNumber} Awaiting Confirmation`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a1a;">Order Reminder</h1>
              <p>Order <strong>${order.orderNumber}</strong> from <strong>${order.restaurant.name}</strong> has been pending for 48 hours.</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p style="margin: 8px 0 0;"><strong>Total:</strong> $${Number(order.total).toFixed(2)}</p>
              </div>
              <p>Please log in to your Sourcery dashboard to confirm or update this order.</p>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                This email was sent by Sourcery. Please do not reply to this email.
              </p>
            </div>
          `,
        });
      }
    });

    // Notify the restaurant owner
    await step.run("notify-owner", async () => {
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: order.restaurantId, role: "OWNER" },
      });

      if (ownerUser) {
        await prisma.notification.create({
          data: {
            type: "ORDER_UPDATE",
            title: "Order Still Pending",
            message: `Order ${order.orderNumber} to ${order.supplier.name} has been pending for 48 hours. A reminder was sent to the supplier.`,
            userId: ownerUser.id,
            metadata: { orderId: order.id },
          },
        });
      }
    });

    return { action: "reminder_sent", orderId: order.id };
  }
);
