import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export const returnNotification = inngest.createFunction(
  { id: "return-notification", name: "Return Status Notification" },
  { event: "return/status.changed" },
  async ({ event }) => {
    try {
      const { returnId, newStatus, restaurantId, supplierId } = event.data;

      const returnRequest = await prisma.returnRequest.findUnique({
        where: { id: returnId },
        include: {
          order: {
            select: {
              orderNumber: true,
              restaurant: { select: { name: true } },
              supplier: { select: { name: true } },
            },
          },
          createdBy: {
            select: { id: true, email: true, firstName: true },
          },
        },
      });

      if (!returnRequest) return { skipped: true, reason: "Return not found" };

      const restaurantName = returnRequest.order.restaurant.name;
      const supplierName = returnRequest.order.supplier.name;

      if (newStatus === "PENDING") {
        // Notify supplier users
        const supplierUsers = await prisma.user.findMany({
          where: { supplierId },
          select: { id: true, email: true, firstName: true },
        });

        for (const user of supplierUsers) {
          await prisma.notification.create({
            data: {
              type: "ORDER_UPDATE",
              title: `New return request from ${restaurantName}`,
              message: `Return ${returnRequest.returnNumber} (${returnRequest.type.replace(/_/g, " ").toLowerCase()}) — ${returnRequest.reason.slice(0, 100)}`,
              userId: user.id,
              metadata: {
                actionUrl: `/supplier/returns`,
                action: "view_return",
                returnId,
              },
            },
          });

          const template = emailTemplates.returnRequestCreated(
            returnRequest.returnNumber,
            restaurantName,
            supplierName,
            returnRequest.type,
            returnRequest.reason
          );
          await sendEmail({
            to: user.email,
            subject: template.subject,
            html: template.html,
          });
        }

        return { notified: supplierUsers.length, status: newStatus };
      }

      // For other statuses, notify the restaurant creator
      if (returnRequest.createdBy) {
        const statusLabel = newStatus.replace(/_/g, " ").toLowerCase();
        let message = `Your return request ${returnRequest.returnNumber} has been ${statusLabel}.`;
        if (newStatus === "CREDIT_ISSUED" && returnRequest.creditAmount) {
          message += ` Credit of $${Number(returnRequest.creditAmount).toFixed(2)} issued.`;
        }

        await prisma.notification.create({
          data: {
            type: "ORDER_UPDATE",
            title: `Return ${statusLabel}: ${returnRequest.returnNumber}`,
            message,
            userId: returnRequest.createdBy.id,
            metadata: {
              actionUrl: `/returns`,
              action: "view_return",
              returnId,
            },
          },
        });

        const template = emailTemplates.returnRequestUpdated(
          returnRequest.returnNumber,
          restaurantName,
          newStatus,
          returnRequest.resolution || undefined
        );
        await sendEmail({
          to: returnRequest.createdBy.email,
          subject: template.subject,
          html: template.html,
        });

        return { notified: 1, status: newStatus };
      }

      return { notified: 0, status: newStatus };
    } catch (err) {
      console.error("[return-notification] failed:", err);
      throw err;
    }
  }
);
