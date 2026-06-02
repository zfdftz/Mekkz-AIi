import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAppUrl,
  getStripe,
  isActiveSubscriptionStatus,
  subscriptionPlan
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  downgradeUserToFree,
  setUserPlanFromStripe
} from "@/lib/user-plans";

export const runtime = "nodejs";

async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  session?: Stripe.Checkout.Session
) {
  const metadataUserId = subscription.metadata.userId || session?.metadata?.userId;
  if (metadataUserId) return metadataUserId;

  const clientReferenceId = session?.client_reference_id;
  if (clientReferenceId) return clientReferenceId;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;

  const { data } = await admin
    .from("user_plans")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

async function syncSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  session?: Stripe.Checkout.Session
) {
  const userId = await resolveUserId(admin, subscription, session);
  if (!userId) return;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  if (!isActiveSubscriptionStatus(subscription.status)) {
    await downgradeUserToFree(admin, userId);
    return;
  }

  const plan = subscriptionPlan(subscription);
  if (!plan) return;

  await setUserPlanFromStripe(admin, userId, plan, {
    customerId,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook nicht konfiguriert." }, { status: 503 });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signatur fehlt." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ungültige Signatur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(admin, subscription, session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(admin, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(admin, subscription);

        if (userId) {
          await downgradeUserToFree(admin, userId);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook-Fehler.";
    console.error("[stripe webhook]", event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true, appUrl: getAppUrl() });
}
