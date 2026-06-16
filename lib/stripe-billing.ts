import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { planUpgradeDifferenceCents } from "./plans";
import { isActiveSubscriptionStatus } from "./stripe";
import { setUserPlanFromStripe } from "./user-plans";

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

export function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const lineSub = invoice.lines?.data?.find((line) => line.subscription)?.subscription;
  if (typeof lineSub === "string") return lineSub;
  if (lineSub && typeof lineSub === "object" && "id" in lineSub) return lineSub.id;

  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;

  return null;
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

/** Anteilige Differenz Pro→Ultra für die restlichen Abo-Tage (Schätzung für UI). */
export function estimateProToUltraProrationCents(
  periodEndUnix: number,
  periodStartUnix?: number
) {
  const nowSec = Math.floor(Date.now() / 1000);
  const total = Math.max(1, periodEndUnix - (periodStartUnix ?? periodEndUnix - 30 * 86400));
  const remaining = Math.max(0, periodEndUnix - nowSec);
  return Math.max(
    0,
    Math.round(planUpgradeDifferenceCents() * (remaining / total))
  );
}

export function estimateProToUltraProrationFromIso(
  periodEndIso: string | null | undefined,
  periodStartIso?: string | null
) {
  if (!periodEndIso) return null;
  const end = Math.floor(new Date(periodEndIso).getTime() / 1000);
  if (!Number.isFinite(end)) return null;
  const start = periodStartIso
    ? Math.floor(new Date(periodStartIso).getTime() / 1000)
    : undefined;
  return estimateProToUltraProrationCents(end, start);
}

export function formatProrationEstimate(cents: number, locale = "de-DE") {
  const euros = cents / 100;
  if (euros < 1) {
    return `~${euros.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} €`;
  }
  return `~${Math.ceil(euros).toLocaleString(locale)} €`;
}

async function resolveUltraPriceId(stripe: Stripe) {
  const fromEnv = process.env.STRIPE_PRICE_ULTRA?.trim();
  if (fromEnv) return fromEnv;

  const prices = await stripe.prices.list({ active: true, limit: 100 });
  const match = prices.data.find(
    (price) =>
      price.recurring &&
      price.currency === "eur" &&
      price.unit_amount === 2900
  );
  if (match?.id) return match.id;

  throw new Error(
    "Ultra-Preis fehlt (STRIPE_PRICE_ULTRA in Vercel oder passender Stripe-Preis)."
  );
}

export async function upgradeProToUltra(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0];
  if (!item?.id) {
    throw new Error("Stripe-Abo konnte nicht aktualisiert werden (keine Position).");
  }

  const ultraPriceId = await resolveUltraPriceId(stripe);

  return stripe.subscriptions.update(subscription.id, {
    items: [{ id: item.id, price: ultraPriceId }],
    proration_behavior: "always_invoice",
    billing_cycle_anchor: "unchanged",
    payment_behavior: "pending_if_incomplete",
    metadata: { ...subscription.metadata, plan: "ultra" },
    expand: ["latest_invoice"]
  });
}

export type ProToUltraUpgradeOutcome =
  | { kind: "success"; message: string }
  | { kind: "invoice"; url: string; message: string }
  | { kind: "error"; message: string; status: number };

export async function completeProToUltraUpgrade(
  stripe: Stripe,
  admin: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription
): Promise<ProToUltraUpgradeOutcome> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  try {
    const updated = await upgradeProToUltra(stripe, subscription);
    const invoice = await resolveLatestInvoice(stripe, updated);

    if (invoiceNeedsPayment(invoice) && invoice?.hosted_invoice_url) {
      return {
        kind: "invoice",
        url: invoice.hosted_invoice_url,
        message:
          "Bitte nur den anteiligen Unterschied für die restlichen Tage bezahlen. Ultra wird danach aktiv."
      };
    }

    if (!isActiveSubscriptionStatus(updated.status)) {
      return {
        kind: "error",
        status: 402,
        message:
          "Upgrade konnte nicht abgeschlossen werden. Bitte Zahlungsmethode prüfen oder „Plan synchronisieren“ nutzen."
      };
    }

    await setUserPlanFromStripe(admin, userId, "ultra", {
      customerId,
      subscriptionId: updated.id,
      subscriptionStatus: updated.status,
      periodEnd: subscriptionPeriodEnd(updated)
    });

    const renewDate = formatBillingDate(subscriptionPeriodEnd(updated));

    return {
      kind: "success",
      message: `Ultra ist aktiv. Es wurde nur der anteilige Unterschied für die restlichen Tage berechnet — dein Abo erneuert sich weiter am ${renewDate}.`
    };
  } catch (error) {
    return {
      kind: "error",
      status: 402,
      message:
        error instanceof Error ? error.message : "Upgrade auf Ultra fehlgeschlagen."
    };
  }
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
