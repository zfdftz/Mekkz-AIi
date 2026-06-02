import { NextResponse } from "next/server";
import { z } from "zod";
import { PLANS, PlanId } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPlanState, setUserPlan } from "@/lib/user-plans";

const admin = createAdminClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  const state = await getUserPlanState(admin, userId);
  return NextResponse.json({ plan: state, plans: PLANS });
}

const upgradeSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["pro", "ultra"])
});

export async function POST(req: Request) {
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
        : "Ultra aktiviert. Unbegrenzte Bilder sind jetzt aktiv."
  });
}
