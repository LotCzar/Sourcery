import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export async function POST() {
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

    if (!user.restaurant.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe to a plan first." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: user.restaurant.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({
      success: true,
      data: { url: session.url },
    });
  } catch (error: unknown) {
    console.error("Billing portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
