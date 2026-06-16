import { NextResponse } from "next/server";
import { isGuestUser } from "@/lib/auth/session";
import { isStripeConfigured, stripeConfigErrorMessage } from "@/lib/stripe";
import { reconcileUserPlanWithStripe } from "@/lib/stripe-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: stripeConfigErrorMessage() }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  if (isGuestUser(user)) {
    return NextResponse.json(
      { error: "Bitte zuerst anmelden, dann Plan synchronisieren." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const state = await reconcileUserPlanWithStripe(admin, user.id, user.email);

  return NextResponse.json({
    synced: state.plan !== "free" || state.hasActiveSubscription,
    plan: state,
    message:
      state.hasActiveSubscription
        ? state.plan === "ultra"
          ? "Ultra ist aktiv."
          : "Pro ist aktiv."
        : "Kein aktives Abo gefunden — Free-Plan ist aktiv."
  });
}
