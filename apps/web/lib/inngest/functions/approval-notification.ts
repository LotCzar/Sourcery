import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export const approvalNotification = inngest.createFunction(
  { id: "approval-notification", name: "Send Approval Request Notifications" },
  { event: "order/approval.requested" },
  async ({ event }) => {
    const { orderId, orderNumber, requesterName, total, restaurantId, requiredRole } = event.data;

    // Find all users with the required role (or higher) at this restaurant
    const approvers = await prisma.user.findMany({
      where: {
        restaurantId,
        role: { in: ["OWNER", "MANAGER"] },
      },
    });

    if (approvers.length === 0) {
      return { action: "skipped", reason: "no_approvers_found" };
    }

    let notified = 0;

    for (const approver of approvers) {
      // Create in-app notification
      await prisma.notification.create({
        data: {
          type: "ORDER_UPDATE",
          title: "Approval Required",
          message: `${requesterName} submitted order ${orderNumber} ($${total.toFixed(2)}) for approval.`,
          userId: approver.id,
          metadata: { orderId, orderNumber, total },
        },
      });

      // Send email
      if (approver.email) {
        const template = emailTemplates.approvalRequested(
          orderNumber,
          requesterName,
          total
        );
        await sendEmail({
          to: approver.email,
          subject: template.subject,
          html: template.html,
        });
      }

      notified++;
    }

    return { action: "notified", approversNotified: notified };
  }
);
