import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { getTierByPriceId } from "@/lib/billing/config";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing is not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const restaurantId = session.metadata?.restaurantId;

        if (!restaurantId || !session.subscription || !session.customer) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer.id;

        // Fetch subscription to get the price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const newTier = priceId ? getTierByPriceId(priceId) : null;

        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId || null,
            ...(newTier ? { planTier: newTier } : {}),
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const newTier = priceId ? getTierByPriceId(priceId) : null;

        const subscriptionId =
          typeof subscription.id === "string" ? subscription.id : subscription.id;

        const restaurant = await prisma.restaurant.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (restaurant && newTier) {
          await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: {
              planTier: newTier,
              stripePriceId: priceId || null,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const restaurant = await prisma.restaurant.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (restaurant) {
          await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: {
              planTier: "STARTER",
              stripeSubscriptionId: null,
              stripePriceId: null,
            },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
