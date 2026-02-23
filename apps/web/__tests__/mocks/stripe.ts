import { vi } from "vitest";

export const mockStripeCustomersCreate = vi.fn().mockResolvedValue({
  id: "cus_test_123",
});

export const mockStripeCheckoutSessionsCreate = vi.fn().mockResolvedValue({
  id: "cs_test_123",
  url: "https://checkout.stripe.com/test",
});

export const mockStripeBillingPortalSessionsCreate = vi.fn().mockResolvedValue({
  id: "bps_test_123",
  url: "https://billing.stripe.com/test",
});

export const mockStripeSubscriptionsRetrieve = vi.fn().mockResolvedValue({
  id: "sub_test_123",
  items: {
    data: [{ price: { id: "price_professional" } }],
  },
});

export const mockStripeWebhooksConstructEvent = vi.fn();

const mockStripeClient = {
  customers: {
    create: mockStripeCustomersCreate,
  },
  checkout: {
    sessions: {
      create: mockStripeCheckoutSessionsCreate,
    },
  },
  billingPortal: {
    sessions: {
      create: mockStripeBillingPortalSessionsCreate,
    },
  },
  subscriptions: {
    retrieve: mockStripeSubscriptionsRetrieve,
  },
  webhooks: {
    constructEvent: mockStripeWebhooksConstructEvent,
  },
};

export const mockGetStripeClient = vi.fn().mockReturnValue(mockStripeClient);

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => mockGetStripeClient(),
}));
