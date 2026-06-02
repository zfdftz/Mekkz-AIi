import Stripe from "stripe";
import { PlanId } from "./plans";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_PRO &&
      process.env.STRIPE_PRICE_ULTRA
  );
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";
}

export function getStripePriceId(plan: Exclude<PlanId, "free">) {
  return plan === "pro"
    ? process.env.STRIPE_PRICE_PRO!
    : process.env.STRIPE_PRICE_ULTRA!;
}

export function planFromStripePriceId(priceId: string): Exclude<PlanId, "free"> | null {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ULTRA) return "ultra";
  return null;
}

export function isActiveSubscriptionStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

export function subscriptionPlan(
  subscription: Stripe.Subscription
): Exclude<PlanId, "free"> | null {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;
  return planFromStripePriceId(priceId);
}
