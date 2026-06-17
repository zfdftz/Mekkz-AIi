import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from "@/lib/community/profile-rules";
import {
  completeProfileFromOnboarding,
  userNeedsOnboarding
} from "@/lib/community/profile";
import { syncUserRewards } from "@/lib/rewards/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const onboardingSchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN_LENGTH, `Mindestens ${USERNAME_MIN_LENGTH} Zeichen.`)
    .max(USERNAME_MAX_LENGTH)
    .regex(/^[\w.-]+$/, "Nur Buchstaben, Zahlen, _, . und - erlaubt."),
  birthday: z.string().min(8, "Bitte gib dein Geburtsdatum an.")
});

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const userId = auth.user!.id;
  const needsOnboarding = await userNeedsOnboarding(admin, userId);

  if (!needsOnboarding) {
    return NextResponse.json({ needsOnboarding: false });
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("username, birthday")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({
    needsOnboarding: true,
    username: profile?.username?.trim() ?? "",
    birthday: profile?.birthday?.trim() ?? ""
  });
}

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;

  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ungültige Eingabe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const userId = auth.user!.id;

  if (!(await userNeedsOnboarding(admin, userId))) {
    return NextResponse.json(
      { error: "Profil ist bereits eingerichtet." },
      { status: 409 }
    );
  }

  try {
    await completeProfileFromOnboarding(
      admin,
      userId,
      parsed.data.username,
      parsed.data.birthday
    );
    await syncUserRewards(admin, userId, auth.user!.email, undefined, true);

    return NextResponse.json({
      ok: true,
      message: "Profil erstellt. Willkommen bei Mekkz!"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Profil konnte nicht erstellt werden." },
      { status: 400 }
    );
  }
}
