import { vi } from "vitest";

export const mockSendEmail = vi.fn().mockResolvedValue(null);

export const mockEmailTemplates = {
  orderPlaced: vi.fn().mockReturnValue({
    subject: "New Order: ORD-TEST",
    html: "<p>Test order email</p>",
  }),
  orderConfirmed: vi.fn().mockReturnValue({
    subject: "Order Confirmed: ORD-TEST",
    html: "<p>Test confirmed email</p>",
  }),
  orderShipped: vi.fn().mockReturnValue({
    subject: "Order Shipped: ORD-TEST",
    html: "<p>Test shipped email</p>",
  }),
  orderDelivered: vi.fn().mockReturnValue({
    subject: "Order Delivered: ORD-TEST",
    html: "<p>Test delivered email</p>",
  }),
};

vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
  emailTemplates: mockEmailTemplates,
}));
