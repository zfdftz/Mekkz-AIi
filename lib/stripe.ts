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

export function usesStripePaymentLinks() {
  return Boolean(
    process.env.STRIPE_PAYMENT_LINK_PRO?.trim() &&
      process.env.STRIPE_PAYMENT_LINK_ULTRA?.trim()
  );
}

export function isStripeConfigured() {
  return missingStripeEnvVars().length === 0;
}

/** Welche STRIPE_* Variablen in Vercel (Production) noch fehlen — ohne Werte. */
export function missingStripeEnvVars(): string[] {
  const missing: string[] = [];
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const hasLinks = usesStripePaymentLinks();
  const hasPrices = Boolean(
    process.env.STRIPE_PRICE_PRO?.trim() && process.env.STRIPE_PRICE_ULTRA?.trim()
  );

  if (!secret) missing.push("STRIPE_SECRET_KEY");

  if (!hasLinks && !hasPrices) {
    missing.push(
      "STRIPE_PAYMENT_LINK_PRO + STRIPE_PAYMENT_LINK_ULTRA (oder STRIPE_PRICE_PRO + STRIPE_PRICE_ULTRA)"
    );
  }

  return missing;
}

export function stripeConfigErrorMessage() {
  const missing = missingStripeEnvVars();
  if (missing.length === 0) {
    return "Stripe ist noch nicht konfiguriert.";
  }
  return `Stripe ist noch nicht konfiguriert. In Vercel → Environments → Production fehlt: ${missing.join(", ")}. Danach Redeploy.`;
}

export function buildStripePaymentLinkUrl(
  plan: Exclude<PlanId, "free">,
  userId?: string | null,
  email?: string | null
) {
  const base =
    plan === "pro"
      ? process.env.STRIPE_PAYMENT_LINK_PRO!
      : process.env.STRIPE_PAYMENT_LINK_ULTRA!;

  const url = new URL(base);
  if (userId) url.searchParams.set("client_reference_id", userId);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
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

function planFromSubscriptionAmount(subscription: Stripe.Subscription) {
  const price = subscription.items.data[0]?.price;
  const amount = price?.unit_amount;
  const currency = price?.currency?.toLowerCase();
  if (currency === "eur" && amount != null) {
    if (amount === 1000) return "pro" as const;
    if (amount === 2900) return "ultra" as const;
  }
  return null;
}

export function subscriptionPlan(
  subscription: Stripe.Subscription
): Exclude<PlanId, "free"> | null {
  const metaPlan = subscription.metadata?.plan;
  if (metaPlan === "pro" || metaPlan === "ultra") return metaPlan;

  const fromAmount = planFromSubscriptionAmount(subscription);
  if (fromAmount) return fromAmount;

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const fromPriceId = planFromStripePriceId(priceId);
    if (fromPriceId) return fromPriceId;
  }

  const nickname = subscription.items.data[0]?.price?.nickname?.toLowerCase() ?? "";
  if (nickname.includes("ultra")) return "ultra";
  if (nickname.includes("pro")) return "pro";

  return null;
}

/** Plan aus Checkout-Session (Payment Links / Metadata / Betrag). */
export function planFromCheckoutSession(
  session: Stripe.Checkout.Session,
  subscription?: Stripe.Subscription
): Exclude<PlanId, "free"> | null {
  const metaPlan = session.metadata?.plan;
  if (metaPlan === "pro" || metaPlan === "ultra") return metaPlan;

  if (subscription) {
    const fromSub = subscriptionPlan(subscription);
    if (fromSub) return fromSub;
  }

  const total = session.amount_total;
  const currency = session.currency?.toLowerCase();
  if (currency === "eur" && total != null) {
    if (total === 1000) return "pro";
    if (total === 2900) return "ultra";
  }

  return null;
}
