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
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json(
        { error: "Only supplier admins can manage billing" },
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
    let customerId = user.supplier.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.supplier.name,
        metadata: { supplierId: user.supplier.id },
      });
      customerId = customer.id;

      await prisma.supplier.update({
        where: { id: user.supplier.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/supplier/settings?billing=success`,
      cancel_url: `${appUrl}/supplier/settings?billing=cancelled`,
      metadata: { supplierId: user.supplier.id },
    });

    return NextResponse.json({
      success: true,
      data: { url: session.url },
    });
  } catch (error: unknown) {
    console.error("Supplier billing checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
