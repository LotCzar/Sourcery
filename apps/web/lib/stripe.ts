import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    });
  }
  return stripeClient;
}
