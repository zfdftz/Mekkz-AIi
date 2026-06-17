import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { isGuestUser } from "@/lib/auth/session";
import {
  formatPlanChangeMessage,
  completePlanUpgrade,
  hasStripePriceIds,
  scheduleUltraDowngradeToPro
} from "@/lib/stripe-billing";
import {
  buildStripePaymentLinkUrl,
  getAppUrl,
  getStripe,
  getStripePriceId,
  isActiveSubscriptionStatus,
  isStripeConfigured,
  stripeConfigErrorMessage,
  subscriptionPlan,
  usesStripePaymentLinks
} from "@/lib/stripe";
import {
  findActiveSubscriptionForUser,
  reconcileUserPlanWithStripe
} from "@/lib/stripe-sync";
import { planRank, type PaidPlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getUserPlanRow,
  getUserStripeBilling,
  resolveEntitledPlan,
  schedulePlanChangeAtPeriodEnd,
  updateStripeCustomerId
} from "@/lib/user-plans";

const checkoutSchema = z.object({
  plan: z.enum(["plus", "pro", "ultra"])
});

async function scheduleUltraToProDowngrade(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string | null | undefined
) {
  await reconcileUserPlanWithStripe(admin, userId, email);
  const activeSubscription = await findActiveSubscriptionForUser(admin, userId, email);

  if (!activeSubscription) {
    return NextResponse.json(
      {
        error:
          "Kein aktives Ultra-Abo gefunden. Bitte kurz warten und erneut versuchen, oder „Abo verwalten“ nutzen."
      },
      { status: 404 }
    );
  }

  try {
    const periodEnd = await scheduleUltraDowngradeToPro(stripe, activeSubscription);
    await schedulePlanChangeAtPeriodEnd(admin, userId, "pro", periodEnd);

    return NextResponse.json({
      scheduled: true,
      message: formatPlanChangeMessage(periodEnd)
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Wechsel zu Pro konnte nicht geplant werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function respondPlanUpgrade(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  subscription: Stripe.Subscription,
  targetPlan: PaidPlanId
) {
  const outcome = await completePlanUpgrade(stripe, admin, userId, subscription, targetPlan);

  if (outcome.kind === "invoice") {
    return NextResponse.json({
      url: outcome.url,
      proration: true,
      message: outcome.message
    });
  }

  if (outcome.kind === "success") {
    return NextResponse.json({
      updated: true,
      proration: true,
      message: outcome.message
    });
  }

  return NextResponse.json({ error: outcome.message }, { status: outcome.status });
}

async function tryProrationUpgrade(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string | null | undefined,
  targetPlan: PaidPlanId,
  subscription?: Stripe.Subscription | null
) {
  const activeSubscription =
    subscription ?? (await findActiveSubscriptionForUser(admin, userId, email));

  if (!activeSubscription) return null;

  const currentPlan = subscriptionPlan(activeSubscription) ?? "free";
  if (currentPlan === "free" || planRank(targetPlan) <= planRank(currentPlan)) {
    return null;
  }

  return respondPlanUpgrade(stripe, admin, userId, activeSubscription, targetPlan);
}

export async function POST(req: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: stripeConfigErrorMessage() }, { status: 503 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || isGuestUser(user)) {
      return NextResponse.json(
        { error: "Bitte zuerst anmelden oder registrieren, dann Plus, Pro oder Ultra kaufen." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültiger Plan." }, { status: 400 });
    }

    const { plan } = parsed.data;
    const appUrl = getAppUrl();
    const admin = createAdminClient();
    await reconcileUserPlanWithStripe(admin, user.id, user.email);

    const billing = await getUserStripeBilling(admin, user.id);
    const planRow = await getUserPlanRow(admin, user.id);
    const dbPlan = resolveEntitledPlan(planRow);
    const stripe = getStripe();

    if (!stripe) {
      return NextResponse.json({ error: "Stripe nicht verfügbar." }, { status: 503 });
    }

    if (dbPlan === "ultra" && plan === "pro") {
      return scheduleUltraToProDowngrade(stripe, admin, user.id, user.email);
    }

    if (dbPlan === "plus" && plan === "plus") {
      return NextResponse.json({
        updated: true,
        message: "Plus ist bereits aktiv."
      });
    }

    if (dbPlan === "pro" && plan === "pro") {
      return NextResponse.json({
        updated: true,
        message: "Pro ist bereits aktiv."
      });
    }

    if (dbPlan === "ultra" && plan === "ultra") {
      return NextResponse.json({
        updated: true,
        message: "Ultra ist bereits aktiv."
      });
    }

    await reconcileUserPlanWithStripe(admin, user.id, user.email);
    const activeSubscription = await findActiveSubscriptionForUser(
      admin,
      user.id,
      user.email
    );

    if (activeSubscription) {
      const currentPlan = subscriptionPlan(activeSubscription) ?? dbPlan;
      const refreshedRow = await getUserPlanRow(admin, user.id);
      const entitledPlan = resolveEntitledPlan(refreshedRow);

      if (
        entitledPlan === plan ||
        (currentPlan === plan && isActiveSubscriptionStatus(activeSubscription.status))
      ) {
        return NextResponse.json({
          updated: true,
          message: `${plan === "plus" ? "Plus" : plan === "pro" ? "Pro" : "Ultra"} ist bereits aktiv.`
        });
      }

      if (planRank(plan) > planRank(currentPlan)) {
        const upgradeResponse = await tryProrationUpgrade(
          stripe,
          admin,
          user.id,
          user.email,
          plan,
          activeSubscription
        );
        if (upgradeResponse) return upgradeResponse;
      }

      return NextResponse.json({
        error: "Du hast bereits ein aktives Abo. Bitte „Abo verwalten“ nutzen."
      });
    }

    if (dbPlan !== "free" && plan !== dbPlan) {
      const upgradeResponse = await tryProrationUpgrade(
        stripe,
        admin,
        user.id,
        user.email,
        plan
      );
      if (upgradeResponse) return upgradeResponse;

      return NextResponse.json({
        error: "Planwechsel nur über die Buttons im Plan-Dialog (nicht als neuer Kauf)."
      });
    }

    const priceId = getStripePriceId(plan);
    if (priceId) {
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
        customer_update: { name: "auto", address: "auto" },
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

    if (usesStripePaymentLinks() && plan !== "plus") {
      return NextResponse.json({
        url: buildStripePaymentLinkUrl(plan, user.id, user.email)
      });
    }

    return NextResponse.json(
      {
        error:
          plan === "plus"
            ? "Stripe-Preis fehlt in Vercel (STRIPE_PRICE_PLUS)."
            : "Stripe-Preise fehlen in Vercel (STRIPE_PRICE_PRO / STRIPE_PRICE_ULTRA)."
      },
      { status: 503 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout fehlgeschlagen.";
    console.error("[stripe checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
