import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { BILLING_PLANS, getPriceId } from "@/lib/billing/config";
import type { PlanTier } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Billing is not configured" },
        { status: 503 }
      );
    }

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only restaurant owners can manage billing" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planTier } = body as { planTier: string };

    if (!planTier || !BILLING_PLANS[planTier as PlanTier]) {
      return NextResponse.json(
        { error: "Invalid plan tier" },
        { status: 400 }
      );
    }

    const priceId = getPriceId(planTier as PlanTier);
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this plan" },
        { status: 400 }
      );
    }

    // Create or reuse Stripe customer
    let customerId = user.restaurant.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.restaurant.name,
        metadata: { restaurantId: user.restaurant.id },
      });
      customerId = customer.id;

      await prisma.restaurant.update({
        where: { id: user.restaurant.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancelled`,
      metadata: { restaurantId: user.restaurant.id },
    });

    return NextResponse.json({
      success: true,
      data: { url: session.url },
    });
  } catch (error: unknown) {
    console.error("Billing checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
