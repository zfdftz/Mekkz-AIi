import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAppUrl,
  getStripe,
  getStripePriceId,
  isStripeConfigured,
  subscriptionPlan
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getUserPlanRow,
  getUserStripeBilling,
  setUserPlanFromStripe,
  updateStripeCustomerId
} from "@/lib/user-plans";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "ultra"])
});

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe ist noch nicht konfiguriert. Bitte STRIPE_* Keys setzen." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Plan." }, { status: 400 });
  }

  const { plan } = parsed.data;
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe nicht verfügbar." }, { status: 503 });
  }

  const admin = createAdminClient();
  const billing = await getUserStripeBilling(admin, user.id);
  const priceId = getStripePriceId(plan);
  const appUrl = getAppUrl();

  if (
    billing.hasActiveSubscription &&
    billing.stripeSubscriptionId &&
    billing.stripeCustomerId
  ) {
    const subscription = await stripe.subscriptions.retrieve(
      billing.stripeSubscriptionId
    );
    const currentPlan = subscriptionPlan(subscription);

    if (currentPlan === plan) {
      return NextResponse.json({
        updated: true,
        message: `${plan === "pro" ? "Pro" : "Ultra"} ist bereits aktiv.`
      });
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: subscription.items.data[0].id, price: priceId }],
      proration_behavior: "create_prorations"
    });

    await setUserPlanFromStripe(admin, user.id, plan, {
      customerId: billing.stripeCustomerId,
      subscriptionId: updated.id,
      subscriptionStatus: updated.status
    });

    return NextResponse.json({
      updated: true,
      message:
        plan === "pro"
          ? "Pro wurde aktiviert. Die Anpassung erscheint auf deiner nächsten Rechnung."
          : "Ultra wurde aktiviert. Die Anpassung erscheint auf deiner nächsten Rechnung."
    });
  }

  let customerId = billing.stripeCustomerId;

  if (!customerId) {
    const row = await getUserPlanRow(admin, user.id);
    customerId = row?.stripe_customer_id ?? null;
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id }
    });
    customerId = customer.id;
    await updateStripeCustomerId(admin, user.id, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: {
      userId: user.id,
      plan
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan
      }
    },
    success_url: `${appUrl}/chat?checkout=success&plan=${plan}`,
    cancel_url: `${appUrl}/chat?checkout=cancel`
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Checkout konnte nicht gestartet werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
