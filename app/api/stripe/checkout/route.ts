import { NextResponse } from "next/server";
import { z } from "zod";
import { isGuestUser } from "@/lib/auth/session";
import {
  formatBillingDate,
  formatPlanChangeMessage,
  hasStripePriceIds,
  invoiceNeedsPayment,
  resolveLatestInvoice,
  scheduleUltraDowngradeToPro,
  subscriptionPeriodEnd,
  upgradeProToUltra
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
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getUserPlanRow,
  getUserStripeBilling,
  resolveEntitledPlan,
  schedulePlanChangeAtPeriodEnd,
  setUserPlanFromStripe,
  updateStripeCustomerId
} from "@/lib/user-plans";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "ultra"])
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
        { error: "Bitte zuerst anmelden oder registrieren, dann Pro oder Ultra kaufen." },
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
      const customerId =
        typeof activeSubscription.customer === "string"
          ? activeSubscription.customer
          : activeSubscription.customer.id;

      const currentPlan = subscriptionPlan(activeSubscription) ?? dbPlan;
      const refreshedRow = await getUserPlanRow(admin, user.id);
      const entitledPlan = resolveEntitledPlan(refreshedRow);

      if (
        entitledPlan === plan ||
        (currentPlan === plan && isActiveSubscriptionStatus(activeSubscription.status))
      ) {
        return NextResponse.json({
          updated: true,
          message: `${plan === "pro" ? "Pro" : "Ultra"} ist bereits aktiv.`
        });
      }

      if (currentPlan === "pro" && plan === "ultra") {
        if (!hasStripePriceIds()) {
          return NextResponse.json(
            {
              error:
                "Upgrade braucht STRIPE_PRICE_PRO und STRIPE_PRICE_ULTRA in Vercel."
            },
            { status: 503 }
          );
        }

        try {
          const updated = await upgradeProToUltra(stripe, activeSubscription);
          const invoice = await resolveLatestInvoice(stripe, updated);

          if (invoiceNeedsPayment(invoice) && invoice?.hosted_invoice_url) {
            return NextResponse.json({
              url: invoice.hosted_invoice_url,
              proration: true,
              message:
                "Bitte den anteiligen Unterschied für die restlichen Tage jetzt bezahlen. Ultra wird danach aktiv."
            });
          }

          if (!isActiveSubscriptionStatus(updated.status)) {
            return NextResponse.json({
              error:
                "Upgrade konnte nicht abgeschlossen werden. Bitte Zahlungsmethode prüfen."
            });
          }

          await setUserPlanFromStripe(admin, user.id, "ultra", {
            customerId,
            subscriptionId: updated.id,
            subscriptionStatus: updated.status,
            periodEnd: subscriptionPeriodEnd(updated)
          });

          const renewDate = formatBillingDate(subscriptionPeriodEnd(updated));

          return NextResponse.json({
            updated: true,
            message: `Ultra ist aktiv. Anteilige Zahlung für die restlichen Tage wurde berechnet — dein Abo erneuert sich weiter am ${renewDate}.`
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Upgrade auf Ultra fehlgeschlagen.";
          return NextResponse.json({ error: message }, { status: 402 });
        }
      }

      return NextResponse.json({
        error: "Du hast bereits ein aktives Abo. Bitte „Abo verwalten“ nutzen."
      });
    }

    if (dbPlan !== "free" && plan !== dbPlan) {
      return NextResponse.json({
        error: "Planwechsel nur über die Buttons im Plan-Dialog (nicht als neuer Kauf)."
      });
    }

    if (hasStripePriceIds()) {
      const priceId = getStripePriceId(plan);
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

    if (usesStripePaymentLinks()) {
      return NextResponse.json({
        url: buildStripePaymentLinkUrl(plan, user.id, user.email)
      });
    }

    return NextResponse.json(
      { error: "Stripe-Preise fehlen in Vercel (STRIPE_PRICE_PRO / STRIPE_PRICE_ULTRA)." },
      { status: 503 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout fehlgeschlagen.";
    console.error("[stripe checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
