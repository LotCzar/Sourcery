import { Resend } from 'resend';

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const client = getResendClient();

  if (!client) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return null;
  }

  try {
    const result = await client.emails.send({
      from: process.env.EMAIL_FROM || 'Sourcery <noreply@sourcery.app>',
      to,
      subject,
      html,
    });
    return result;
  } catch (error) {
    console.error('Email send error:', error);
    return null;
  }
}

export const emailTemplates = {
  orderPlaced: (orderNumber: string, restaurantName: string, total: number) => ({
    subject: `New Order: ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">New Order Received</h1>
        <p>You've received a new order from <strong>${restaurantName}</strong>.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0;"><strong>Total:</strong> $${total.toFixed(2)}</p>
        </div>
        <p>Log in to your Sourcery dashboard to view and confirm this order.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by Sourcery. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  orderConfirmed: (orderNumber: string, supplierName: string, restaurantEmail: string) => ({
    subject: `Order Confirmed: ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Order Confirmed</h1>
        <p><strong>${supplierName}</strong> has confirmed your order.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${orderNumber}</p>
        </div>
        <p>Your order is being prepared and will be shipped soon.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by Sourcery. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  orderShipped: (orderNumber: string, supplierName: string) => ({
    subject: `Order Shipped: ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Order Shipped</h1>
        <p>Your order from <strong>${supplierName}</strong> is on the way!</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${orderNumber}</p>
        </div>
        <p>Track your order status in your Sourcery dashboard.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by Sourcery. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  orderDelivered: (orderNumber: string, invoiceNumber: string, total: number) => ({
    subject: `Order Delivered: ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Order Delivered</h1>
        <p>Your order has been delivered successfully.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 8px 0 0;"><strong>Total:</strong> $${total.toFixed(2)}</p>
        </div>
        <p>An invoice has been created and is available in your dashboard. Payment is due within 30 days.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by Sourcery. Please do not reply to this email.
        </p>
      </div>
    `,
  }),
};
