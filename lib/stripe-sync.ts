import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PlanId } from "./plans";
import {
  getStripe,
  isEntitledSubscriptionStatus,
  subscriptionPlan
} from "./stripe";
import {
  downgradeUserToFree,
  getUserPlanRow,
  getUserPlanState,
  getUserStripeBilling,
  hasStoredPaidPlan,
  resolveEntitledPlan,
  schedulePlanChangeAtPeriodEnd,
  setUserPlanFromStripe,
  type UserPlanState
} from "./user-plans";
import { subscriptionPeriodEnd, trySubscriptionPeriodEnd } from "./stripe-billing";

export type StripeSyncResult = {
  synced: boolean;
  plan: PlanId;
  message: string;
  state?: UserPlanState;
};

function planRank(plan: PlanId) {
  if (plan === "ultra") return 2;
  if (plan === "pro") return 1;
  return 0;
}

function pickBestSubscription(subscriptions: Stripe.Subscription[]) {
  const active = subscriptions.filter((sub) =>
    isEntitledSubscriptionStatus(sub.status)
  );
  if (active.length === 0) return null;

  let best: { subscription: Stripe.Subscription; plan: Exclude<PlanId, "free"> } | null =
    null;

  for (const subscription of active) {
    const plan = subscriptionPlan(subscription);
    if (!plan) continue;
    if (!best || planRank(plan) > planRank(best.plan)) {
      best = { subscription, plan };
    }
  }

  return best;
}

async function listCustomersByEmail(stripe: Stripe, email: string) {
  const normalized = email.trim().toLowerCase();
  const customers = await stripe.customers.list({ email: normalized, limit: 100 });

  if (customers.data.length > 0) {
    return customers.data;
  }

  const search = await stripe.customers.search({
    query: `email:'${normalized.replace(/'/g, "\\'")}'`,
    limit: 100
  });

  return search.data;
}

async function findSubscriptionsLinkedToUser(stripe: Stripe, userId: string) {
  const subscriptions: Stripe.Subscription[] = [];

  try {
    const search = await stripe.subscriptions.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 20
    });
    subscriptions.push(...search.data);
  } catch {
    // Subscription search may be unavailable on some Stripe accounts.
  }

  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  for (const session of sessions.data) {
    if (session.client_reference_id !== userId || session.mode !== "subscription") continue;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) continue;

    try {
      subscriptions.push(await stripe.subscriptions.retrieve(subscriptionId));
    } catch {
      // Ignore stale checkout sessions.
    }
  }

  return subscriptions;
}

async function listActiveSubscriptionsForCustomer(
  stripe: Stripe,
  customerId: string
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20
  });

  return subscriptions.data;
}

async function collectSubscriptionsForUser(
  stripe: Stripe,
  admin: SupabaseClient,
  userId: string,
  email?: string | null
) {
  const billing = await getUserStripeBilling(admin, userId);
  const customerIds = new Set<string>();

  if (billing.stripeCustomerId) {
    customerIds.add(billing.stripeCustomerId);
  }

  const subscriptions: Stripe.Subscription[] = [];

  if (billing.stripeSubscriptionId) {
    try {
      subscriptions.push(await stripe.subscriptions.retrieve(billing.stripeSubscriptionId));
    } catch {
      // Stale subscription id — continue broader lookup.
    }
  }

  if (email) {
    const customers = await listCustomersByEmail(stripe, email);
    for (const customer of customers) {
      customerIds.add(customer.id);
    }
  }

  subscriptions.push(...(await findSubscriptionsLinkedToUser(stripe, userId)));

  for (const customerId of customerIds) {
    const customerSubs = await listActiveSubscriptionsForCustomer(stripe, customerId);
    subscriptions.push(...customerSubs);
  }

  const uniqueSubscriptions = [
    ...new Map(subscriptions.map((subscription) => [subscription.id, subscription])).values()
  ];

  return { billing, customerIds, subscriptions: uniqueSubscriptions };
}

export async function findActiveSubscriptionForUser(
  admin: SupabaseClient,
  userId: string,
  email?: string | null
) {
  const stripe = getStripe();
  if (!stripe) return null;

  const { subscriptions } = await collectSubscriptionsForUser(stripe, admin, userId, email);
  return pickBestSubscription(subscriptions)?.subscription ?? null;
}

export async function syncUserPlanFromStripe(
  admin: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<StripeSyncResult> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      synced: false,
      plan: "free",
      message: "Stripe ist nicht konfiguriert."
    };
  }

  const { customerIds, subscriptions } = await collectSubscriptionsForUser(
    stripe,
    admin,
    userId,
    email
  );

  const uniqueSubscriptions = [
    ...new Map(subscriptions.map((subscription) => [subscription.id, subscription])).values()
  ];

  const match = pickBestSubscription(uniqueSubscriptions);

  if (!match) {
    const row = await getUserPlanRow(admin, userId);
    if (hasStoredPaidPlan(row)) {
      const state = await downgradeUserToFree(admin, userId);
      return {
        synced: true,
        plan: "free",
        state,
        message:
          "Kein aktives Stripe-Abo gefunden. Dein Tarif wurde wieder auf Free gesetzt."
      };
    }

    return {
      synced: false,
      plan: "free",
      message:
        customerIds.size === 0
          ? "Kein Stripe-Abo zu deinem mekkz-Konto gefunden. Bitte beim Bezahlen dieselbe E-Mail wie bei mekkz AI verwenden."
          : "Kein aktives Abo bei Stripe gefunden. Prüfe, ob die Zahlung wirklich durchging."
    };
  }

  const customerId =
    typeof match.subscription.customer === "string"
      ? match.subscription.customer
      : match.subscription.customer.id;

  let state: UserPlanState;
  try {
    state = await setUserPlanFromStripe(admin, userId, match.plan, {
      customerId,
      subscriptionId: match.subscription.id,
      subscriptionStatus: match.subscription.status,
      periodEnd: trySubscriptionPeriodEnd(match.subscription)
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Plan konnte nicht gespeichert werden.";
    return {
      synced: false,
      plan: "free",
      message: message.includes("migration-stripe")
        ? message
        : `${message} Führe supabase/migration-stripe-complete.sql im Supabase SQL Editor aus (oder npm run migrate:stripe).`
    };
  }

  if (state.plan !== match.plan) {
    return {
      synced: false,
      plan: state.plan,
      state,
      message:
        "Zahlung bei Stripe erkannt, aber der Plan konnte nicht gespeichert werden. Bitte supabase/migration-stripe-complete.sql in Supabase ausführen (oder npm run migrate:stripe)."
    };
  }

  return {
    synced: true,
    plan: match.plan,
    state,
    message:
      match.plan === "ultra"
        ? "Ultra ist jetzt aktiv."
        : "Pro ist jetzt aktiv."
  };
}

/** Stripe = Quelle der Wahrheit: aktives Abo setzen oder veralteten Paid-Plan zurücksetzen. */
export async function reconcileUserPlanWithStripe(
  admin: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<UserPlanState> {
  const stripe = getStripe();
  if (!stripe) {
    return getUserPlanState(admin, userId);
  }

  const result = await syncUserPlanFromStripe(admin, userId, email);
  if (result.synced && result.state) {
    return result.state;
  }

  const row = await getUserPlanRow(admin, userId);
  if (hasStoredPaidPlan(row) && resolveEntitledPlan(row) === "free") {
    return downgradeUserToFree(admin, userId);
  }

  return getUserPlanState(admin, userId);
}
