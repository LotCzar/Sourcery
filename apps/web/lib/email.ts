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
      from: process.env.EMAIL_FROM || 'FreshSheet <noreply@freshsheet.app>',
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
        <p>Log in to your FreshSheet dashboard to view and confirm this order.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by FreshSheet. Please do not reply to this email.
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
          This email was sent by FreshSheet. Please do not reply to this email.
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
        <p>Track your order status in your FreshSheet dashboard.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by FreshSheet. Please do not reply to this email.
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
          This email was sent by FreshSheet. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  invoiceReminder: (invoiceNumber: string, supplierName: string, amount: number, dueDate: string, milestone: string) => ({
    subject: `Invoice ${milestone}: ${invoiceNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Invoice Payment Reminder</h1>
        <p>This is a reminder about your invoice from <strong>${supplierName}</strong>.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Invoice:</strong> ${invoiceNumber}</p>
          <p style="margin: 8px 0 0;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p style="margin: 8px 0 0;"><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Please ensure payment is made by the due date to maintain your supplier relationship.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by FreshSheet. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  invoiceOverdue: (invoiceNumber: string, supplierName: string, amount: number, daysPastDue: number) => ({
    subject: `OVERDUE: Invoice ${invoiceNumber} (${daysPastDue} days past due)`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #cc0000;">Invoice Overdue</h1>
        <p>Your invoice from <strong>${supplierName}</strong> is <strong>${daysPastDue} days past due</strong>.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Invoice:</strong> ${invoiceNumber}</p>
          <p style="margin: 8px 0 0;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p style="margin: 8px 0 0;"><strong>Days Past Due:</strong> ${daysPastDue}</p>
        </div>
        <p>Please arrange payment immediately to avoid any disruptions to your supply chain.</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by FreshSheet. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  weeklyDigest: (restaurantName: string, aiSummary: string, metrics: { totalSpend: number; orderCount: number; lowStockCount: number; priceAlerts: number; wastePercent: number; overdueInvoices: number }) => ({
    subject: `Weekly Digest: ${restaurantName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Weekly Digest</h1>
        <p>${aiSummary}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0;"><strong>Total Spend</strong></td>
            <td style="padding: 8px 0; text-align: right;">$${metrics.totalSpend.toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0;"><strong>Orders</strong></td>
            <td style="padding: 8px 0; text-align: right;">${metrics.orderCount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0;"><strong>Low Stock Items</strong></td>
            <td style="padding: 8px 0; text-align: right;">${metrics.lowStockCount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0;"><strong>Price Alerts</strong></td>
            <td style="padding: 8px 0; text-align: right;">${metrics.priceAlerts}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0;"><strong>Waste Rate</strong></td>
            <td style="padding: 8px 0; text-align: right;">${metrics.wastePercent.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Overdue Invoices</strong></td>
            <td style="padding: 8px 0; text-align: right;">${metrics.overdueInvoices}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 24px;">
          <a href="/dashboard" style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">View Dashboard</a>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This email was sent by FreshSheet. Please do not reply to this email.
        </p>
      </div>
    `,
  }),
};
