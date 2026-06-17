import Stripe from "stripe";
import { isPaidPlanId, PaidPlanId, PlanId, PLAN_MONTHLY_CENTS } from "./plans";
import { trySubscriptionPeriodEnd } from "./stripe-billing";

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
  plan: PaidPlanId,
  userId?: string | null,
  email?: string | null
) {
  const base =
    plan === "plus"
      ? process.env.STRIPE_PAYMENT_LINK_PLUS
      : plan === "pro"
        ? process.env.STRIPE_PAYMENT_LINK_PRO!
        : process.env.STRIPE_PAYMENT_LINK_ULTRA!;

  if (!base?.trim()) {
    throw new Error(`Kein Stripe Payment Link für ${plan}.`);
  }

  const url = new URL(base);
  if (userId) url.searchParams.set("client_reference_id", userId);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";
}

export function getStripePriceId(plan: PaidPlanId): string | null {
  if (plan === "plus") return process.env.STRIPE_PRICE_PLUS?.trim() || null;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO?.trim() || null;
  return process.env.STRIPE_PRICE_ULTRA?.trim() || null;
}

export function planFromStripePriceId(priceId: string): PaidPlanId | null {
  if (priceId === process.env.STRIPE_PRICE_PLUS?.trim()) return "plus";
  if (priceId === process.env.STRIPE_PRICE_PRO?.trim()) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ULTRA?.trim()) return "ultra";
  return null;
}

export function isActiveSubscriptionStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

/** Includes grace/retry states where Stripe still expects access. */
export function isEntitledSubscriptionStatus(status: string | null | undefined) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
}

export function isPeriodEndInFuture(
  periodEnd: number | string | null | undefined
) {
  if (periodEnd == null) return false;
  const ms =
    typeof periodEnd === "number"
      ? periodEnd * 1000
      : new Date(periodEnd).getTime();
  return Number.isFinite(ms) && ms > Date.now();
}

/** Paid access until Stripe period end (incl. cancel_at_period_end / canceled grace). */
export function subscriptionGrantsPaidAccess(subscription: Stripe.Subscription) {
  if (isEntitledSubscriptionStatus(subscription.status)) return true;
  return isPeriodEndInFuture(trySubscriptionPeriodEnd(subscription));
}

export function shouldDowngradeFromSubscription(subscription: Stripe.Subscription) {
  const status = subscription.status;
  if (isEntitledSubscriptionStatus(status)) return false;

  const periodEnd = trySubscriptionPeriodEnd(subscription);
  if (periodEnd && periodEnd * 1000 > Date.now()) return false;

  if (status === "canceled" || status === "incomplete_expired") return true;
  if (status === "unpaid") return true;

  return status !== "incomplete";
}

function planFromSubscriptionAmount(subscription: Stripe.Subscription): PaidPlanId | null {
  const price = subscription.items.data[0]?.price;
  const amount = price?.unit_amount;
  const currency = price?.currency?.toLowerCase();
  if (currency === "eur" && amount != null) {
    if (amount === PLAN_MONTHLY_CENTS.plus) return "plus";
    if (amount === PLAN_MONTHLY_CENTS.pro) return "pro";
    if (amount === PLAN_MONTHLY_CENTS.ultra) return "ultra";
  }
  return null;
}

export function subscriptionPlan(subscription: Stripe.Subscription): PaidPlanId | null {
  const metaPlan = subscription.metadata?.plan;
  if (isPaidPlanId(metaPlan)) return metaPlan;

  const fromAmount = planFromSubscriptionAmount(subscription);
  if (fromAmount) return fromAmount;

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const fromPriceId = planFromStripePriceId(priceId);
    if (fromPriceId) return fromPriceId;
  }

  const nickname = subscription.items.data[0]?.price?.nickname?.toLowerCase() ?? "";
  const product = subscription.items.data[0]?.price?.product;
  const productName =
    product && typeof product === "object" && "name" in product && product.name
      ? product.name.toLowerCase()
      : "";

  if (nickname.includes("ultra") || productName.includes("ultra")) return "ultra";
  if (nickname.includes("pro") || productName.includes(" pro")) return "pro";
  if (nickname.includes("plus") || productName.includes("plus")) return "plus";

  return null;
}

/** Plan aus Checkout-Session (Payment Links / Metadata / Betrag). */
export function planFromCheckoutSession(
  session: Stripe.Checkout.Session,
  subscription?: Stripe.Subscription
): PaidPlanId | null {
  const metaPlan = session.metadata?.plan;
  if (isPaidPlanId(metaPlan)) return metaPlan;

  if (subscription) {
    const fromSub = subscriptionPlan(subscription);
    if (fromSub) return fromSub;
  }

  const total = session.amount_total;
  const currency = session.currency?.toLowerCase();
  if (currency === "eur" && total != null) {
    if (total === PLAN_MONTHLY_CENTS.plus) return "plus";
    if (total === PLAN_MONTHLY_CENTS.pro) return "pro";
    if (total === PLAN_MONTHLY_CENTS.ultra) return "ultra";
  }

  return null;
}
