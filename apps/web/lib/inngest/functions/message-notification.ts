import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export const messageNotification = inngest.createFunction(
  { id: "message-notification", name: "Send Order Message Notifications" },
  { event: "order/message.sent" },
  async ({ event }) => {
    const {
      orderId,
      orderNumber,
      senderName,
      messagePreview,
      isSupplierSender,
      restaurantId,
      supplierId,
    } = event.data;

    let recipients: { id: string; email: string }[] = [];

    if (isSupplierSender) {
      // Sender is supplier → notify restaurant users
      const restaurantUsers = await prisma.user.findMany({
        where: { restaurantId },
        select: { id: true, email: true },
      });
      recipients = restaurantUsers;
    } else {
      // Sender is restaurant → notify supplier users
      const supplierUsers = await prisma.user.findMany({
        where: { supplierId },
        select: { id: true, email: true },
      });
      recipients = supplierUsers;
    }

    let notified = 0;

    for (const recipient of recipients) {
      // Create in-app notification
      await prisma.notification.create({
        data: {
          type: "ORDER_UPDATE",
          title: "New Message",
          message: `${senderName} sent a message on order ${orderNumber}: "${messagePreview.length > 100 ? messagePreview.slice(0, 100) + "..." : messagePreview}"`,
          userId: recipient.id,
          metadata: { orderId, orderNumber },
        },
      });

      // Send email
      const template = emailTemplates.orderMessage(
        orderNumber,
        senderName,
        messagePreview
      );
      await sendEmail({
        to: recipient.email,
        subject: template.subject,
        html: template.html,
      });

      notified++;
    }

    return { action: "notified", recipientsNotified: notified };
  }
);
