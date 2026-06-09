import Stripe from "stripe";
import { planUpgradeDifferenceCents } from "./plans";
import { getStripePriceId } from "./stripe";

export function hasStripePriceIds() {
  return Boolean(process.env.STRIPE_PRICE_PRO && process.env.STRIPE_PRICE_ULTRA);
}

export function formatBillingDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function formatBillingDateIso(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function formatPlanChangeMessage(periodEndUnix: number, targetPlanLabel = "Pro") {
  const date = formatBillingDate(periodEndUnix);
  return `Am Abo-Ende (${date}) geht dein Plan automatisch auf ${targetPlanLabel} weiter. Bis dahin bleibt Ultra aktiv. (30 Tage ab Kaufdatum — nicht Kalendermonatsende.)`;
}

/** Stripe v18+: Abrechnungszeitraum liegt am ersten Subscription-Item. */
export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const end = subscription.items.data[0]?.current_period_end;
  if (end == null) {
    throw new Error("Abo-Ende konnte nicht ermittelt werden.");
  }
  return end;
}

export function trySubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const end = subscription.items.data[0]?.current_period_end;
  return end ?? undefined;
}

export function subscriptionPeriodStart(subscription: Stripe.Subscription) {
  const start = subscription.items.data[0]?.current_period_start;
  if (start == null) {
    throw new Error("Abo-Start konnte nicht ermittelt werden.");
  }
  return start;
}

export function upgradeDifferenceLabel() {
  const euros = (planUpgradeDifferenceCents() / 100).toFixed(0);
  return `${euros} €`;
}

export async function upgradeProToUltra(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0];
  if (!item?.id) {
    throw new Error("Stripe-Abo konnte nicht aktualisiert werden (keine Position).");
  }

  return stripe.subscriptions.update(subscription.id, {
    items: [{ id: item.id, price: getStripePriceId("ultra") }],
    proration_behavior: "always_invoice",
    billing_cycle_anchor: "unchanged",
    payment_behavior: "error_if_incomplete",
    metadata: { ...subscription.metadata, plan: "ultra" },
    expand: ["latest_invoice.payment_intent"]
  });
}

export async function resolveLatestInvoice(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const latest = subscription.latest_invoice;
  if (!latest) return null;
  if (typeof latest === "string") {
    return stripe.invoices.retrieve(latest);
  }
  return latest;
}

export function invoiceNeedsPayment(invoice: Stripe.Invoice | null) {
  if (!invoice) return false;
  return invoice.status === "open" || (invoice.amount_due ?? 0) > 0;
}

export async function scheduleUltraDowngradeToPro(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const currentUltraPrice = subscription.items.data[0]?.price?.id;
  const ultraPrice =
    currentUltraPrice ??
    process.env.STRIPE_PRICE_ULTRA?.trim() ??
    (() => {
      throw new Error("Ultra-Preis konnte nicht gefunden werden.");
    })();

  let proPrice = process.env.STRIPE_PRICE_PRO?.trim();
  if (!proPrice) {
    const prices = await stripe.prices.list({ active: true, limit: 100 });
    const match = prices.data.find(
      (price) =>
        price.recurring &&
        price.currency === "eur" &&
        price.unit_amount === 1000
    );
    if (!match?.id) {
      throw new Error("Pro-Preis konnte nicht gefunden werden.");
    }
    proPrice = match.id;
  }

  const periodEnd = subscriptionPeriodEnd(subscription);
  const periodStart = subscriptionPeriodStart(subscription);

  const existingScheduleId =
    typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule?.id ?? null;

  let scheduleId = existingScheduleId;

  if (scheduleId) {
    try {
      await stripe.subscriptionSchedules.release(scheduleId);
      scheduleId = null;
    } catch {
      // Wenn release nicht geht, versuchen wir die bestehende Schedule zu aktualisieren.
    }
  }

  if (!scheduleId) {
    const created = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id
    });
    scheduleId = created.id;
  }

  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  const phaseStart = schedule.phases[0]?.start_date ?? periodStart;

  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: ultraPrice, quantity: 1 }],
        start_date: phaseStart,
        end_date: periodEnd
      },
      {
        items: [{ price: proPrice, quantity: 1 }],
        start_date: periodEnd
      }
    ]
  });

  return periodEnd;
}
