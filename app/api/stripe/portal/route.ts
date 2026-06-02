import { NextResponse } from "next/server";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserStripeBilling } from "@/lib/user-plans";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe ist noch nicht konfiguriert." },
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

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe nicht verfügbar." }, { status: 503 });
  }

  const admin = createAdminClient();
  const billing = await getUserStripeBilling(admin, user.id);

  if (!billing.stripeCustomerId) {
    return NextResponse.json(
      { error: "Kein Stripe-Konto gefunden. Bitte zuerst einen Plan kaufen." },
      { status: 400 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${getAppUrl()}/chat`
  });

  return NextResponse.json({ url: session.url });
}
