import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { canManageRewards } from "@/lib/rewards/admin-access";
import { grantBadge, listUserBadges, revokeBadge } from "@/lib/rewards/badges";
import { BADGES } from "@/lib/rewards/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  userId: z.string().uuid(),
  badgeId: z.string(),
  action: z.enum(["grant", "revoke"])
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const allowed = await canManageRewards(admin, auth.user!.id, auth.user!.email);
  if (!allowed) {
    return NextResponse.json({ error: "Keine Admin-Berechtigung." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!BADGES[parsed.data.badgeId]) {
    return NextResponse.json({ error: "Unbekanntes Badge." }, { status: 400 });
  }

  const { userId, badgeId, action } = parsed.data;

  try {
    if (action === "grant") {
      await grantBadge(admin, userId, badgeId, `admin:${auth.user!.id}`);
    } else {
      await revokeBadge(admin, userId, badgeId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 400 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const allowed = await canManageRewards(admin, auth.user!.id, auth.user!.email);
  if (!allowed) {
    return NextResponse.json({ error: "Keine Admin-Berechtigung." }, { status: 403 });
  }

  const username = new URL(req.url).searchParams.get("username")?.trim();
  if (username) {
    const { data, error } = await admin
      .from("user_profiles")
      .select("user_id, username")
      .ilike("username", username)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }
    const badges = await listUserBadges(admin, data.user_id as string);
    return NextResponse.json({
      user: {
        userId: data.user_id,
        username: data.username,
        badges: badges.map((b) => b.id)
      }
    });
  }

  return NextResponse.json({
    badges: Object.values(BADGES).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description
    }))
  });
}
