import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export const supplierVerificationNotify = inngest.createFunction(
  { id: "supplier-verification-notify", name: "Notify Admins of New Supplier Application" },
  { event: "supplier/verification.requested" },
  async ({ event }) => {
    try {
      const { supplierId, supplierName, supplierEmail } = event.data;

      // Find all OWNER-role users to notify
      const owners = await prisma.user.findMany({
        where: { role: "OWNER" },
      });

      if (owners.length === 0) {
        return { action: "skipped", reason: "no_owners_found" };
      }

      let notified = 0;

      for (const owner of owners) {
        // Create in-app notification
        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "New Supplier Application",
            message: `${supplierName} (${supplierEmail}) has applied to join FreshSheet and is awaiting verification.`,
            userId: owner.id,
            metadata: { supplierId, actionUrl: "/admin/suppliers" },
          },
        });

        notified++;
      }

      // Send email to first owner
      const firstOwner = owners[0];
      if (firstOwner.email) {
        await sendEmail({
          to: firstOwner.email,
          subject: `New Supplier Application: ${supplierName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a1a;">New Supplier Application</h1>
              <p><strong>${supplierName}</strong> has applied to join FreshSheet as a supplier.</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Supplier:</strong> ${supplierName}</p>
                <p style="margin: 8px 0 0;"><strong>Email:</strong> ${supplierEmail}</p>
              </div>
              <p>Review and approve or reject this application in your admin dashboard.</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://freshsheet.app'}/admin/suppliers" style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Review Application</a>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                This email was sent by FreshSheet. Please do not reply to this email.
              </p>
            </div>
          `,
        });
      }

      return { action: "notified", ownersNotified: notified };
    } catch (err) {
      console.error("[supplier-verification-notify] failed:", { supplierId: event.data.supplierId }, err);
      throw err;
    }
  }
);
