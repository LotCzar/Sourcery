import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import {
  mockStripeWebhooksConstructEvent,
  mockStripeSubscriptionsRetrieve,
} from "./mocks/stripe";
import { createMockRestaurant } from "./fixtures";
import { parseResponse } from "./helpers";
import { POST } from "@/app/api/billing/webhook/route";

function createWebhookRequest(body: string, signature: string = "sig_test") {
  return new Request("http://localhost:3000/api/billing/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
}

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    mockStripeWebhooksConstructEvent.mockReset();
    mockStripeSubscriptionsRetrieve.mockReset();
  });

  it("returns 400 when missing stripe-signature header", async () => {
    const req = new Request("http://localhost:3000/api/billing/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    const { status, data } = await parseResponse(res);
    expect(status).toBe(400);
    expect(data.error).toContain("stripe-signature");
  });

  it("returns 400 for invalid signature", async () => {
    mockStripeWebhooksConstructEvent.mockImplementationOnce(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(createWebhookRequest("{}", "invalid_sig"));
    const { status, data } = await parseResponse(res);
    expect(status).toBe(400);
    expect(data.error).toContain("Invalid signature");
  });

  it("handles checkout.session.completed and updates restaurant", async () => {
    mockStripeWebhooksConstructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          customer: "cus_123",
          subscription: "sub_123",
          metadata: { restaurantId: "rest_1" },
        },
      },
    });

    mockStripeSubscriptionsRetrieve.mockResolvedValueOnce({
      id: "sub_123",
      items: {
        data: [{ price: { id: "price_professional" } }],
      },
    });

    // Mock env for billing config
    process.env.STRIPE_PRICE_PROFESSIONAL = "price_professional";

    prismaMock.restaurant.update.mockResolvedValueOnce(
      createMockRestaurant({
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        planTier: "PROFESSIONAL",
      }) as any
    );

    const res = await POST(createWebhookRequest("{}", "sig_valid"));
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.received).toBe(true);
    expect(prismaMock.restaurant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rest_1" },
        data: expect.objectContaining({
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          stripePriceId: "price_professional",
        }),
      })
    );
  });

  it("handles customer.subscription.updated and changes tier", async () => {
    process.env.STRIPE_PRICE_ENTERPRISE = "price_enterprise";

    mockStripeWebhooksConstructEvent.mockReturnValueOnce({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          items: {
            data: [{ price: { id: "price_enterprise" } }],
          },
        },
      },
    });

    prismaMock.restaurant.findUnique.mockResolvedValueOnce(
      createMockRestaurant({
        stripeSubscriptionId: "sub_123",
      }) as any
    );
    prismaMock.restaurant.update.mockResolvedValueOnce(
      createMockRestaurant({ planTier: "ENTERPRISE" }) as any
    );

    const res = await POST(createWebhookRequest("{}", "sig_valid"));
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(prismaMock.restaurant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planTier: "ENTERPRISE",
        }),
      })
    );
  });

  it("handles customer.subscription.deleted and downgrades to STARTER", async () => {
    mockStripeWebhooksConstructEvent.mockReturnValueOnce({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
        },
      },
    });

    prismaMock.restaurant.findUnique.mockResolvedValueOnce(
      createMockRestaurant({
        stripeSubscriptionId: "sub_123",
        planTier: "PROFESSIONAL",
      }) as any
    );
    prismaMock.restaurant.update.mockResolvedValueOnce(
      createMockRestaurant({ planTier: "STARTER" }) as any
    );

    const res = await POST(createWebhookRequest("{}", "sig_valid"));
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(prismaMock.restaurant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planTier: "STARTER",
          stripeSubscriptionId: null,
          stripePriceId: null,
        }),
      })
    );
  });
});
