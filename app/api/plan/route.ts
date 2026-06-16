import { NextResponse } from "next/server";
import { z } from "zod";
import { isGuestUser } from "@/lib/auth/session";
import { PLANS, PlanId } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { reconcileUserPlanWithStripe } from "@/lib/stripe-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserPlanState, setUserPlan } from "@/lib/user-plans";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const admin = createAdminClient();

  if (!isGuestUser(user) && isStripeConfigured() && user.email) {
    try {
      await reconcileUserPlanWithStripe(admin, user.id, user.email);
    } catch {
      // Plan reconcile is best-effort before returning plan state.
    }
  }

  const state = await getUserPlanState(admin, userId);
  return NextResponse.json(
    { plan: state, plans: PLANS },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    }
  );
}

const upgradeSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["pro", "ultra"])
});

export async function POST(req: Request) {
  const admin = createAdminClient();

  if (isStripeConfigured() && process.env.ALLOW_DEMO_PLAN_UPGRADE !== "true") {
    return NextResponse.json(
      {
        error:
          "Upgrades laufen über Stripe. Bitte Pro oder Ultra im Plan-Dialog kaufen."
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = upgradeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Upgrade-Anfrage." }, { status: 400 });
  }

  const { userId, plan } = parsed.data;
  const state = await setUserPlan(admin, userId, plan as PlanId);

  return NextResponse.json({
    plan: state,
    message:
      plan === "pro"
        ? "Pro aktiviert. Schnelleres Bild erstellen ist jetzt aktiv."
        : `Ultra aktiviert. ${PLANS.ultra.dailyImageLimit} Bilder pro Tag sind jetzt aktiv.`
  });
}
