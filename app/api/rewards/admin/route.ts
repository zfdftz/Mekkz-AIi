import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { canManageRewards } from "@/lib/rewards/admin-access";
import { grantBadge, listUserBadges, revokeBadge } from "@/lib/rewards/badges";
import { adminGrantTitle, adminRevokeTitle, getUnlockedTitles } from "@/lib/rewards/cosmetics";
import { BADGES, TITLES } from "@/lib/rewards/catalog";
import { setChosenStatus } from "@/lib/rewards/verification";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum([
    "grant-badge",
    "revoke-badge",
    "grant-title",
    "revoke-title",
    "set-chosen"
  ]),
  badgeId: z.string().optional(),
  titleId: z.string().optional(),
  chosen: z.boolean().optional()
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

  const { userId, action, badgeId, titleId, chosen } = parsed.data;

  try {
    switch (action) {
      case "grant-badge":
        if (!badgeId || !BADGES[badgeId]) {
          return NextResponse.json({ error: "Unbekanntes Badge." }, { status: 400 });
        }
        await grantBadge(admin, userId, badgeId, `admin:${auth.user!.id}`);
        break;
      case "revoke-badge":
        if (!badgeId || !BADGES[badgeId]) {
          return NextResponse.json({ error: "Unbekanntes Badge." }, { status: 400 });
        }
        await revokeBadge(admin, userId, badgeId);
        break;
      case "grant-title":
        if (!titleId || !TITLES[titleId]) {
          return NextResponse.json({ error: "Unbekannter Titel." }, { status: 400 });
        }
        await adminGrantTitle(admin, userId, titleId);
        break;
      case "revoke-title":
        if (!titleId || !TITLES[titleId]) {
          return NextResponse.json({ error: "Unbekannter Titel." }, { status: 400 });
        }
        await adminRevokeTitle(admin, userId, titleId);
        break;
      case "set-chosen":
        if (typeof chosen !== "boolean") {
          return NextResponse.json({ error: "chosen muss true/false sein." }, { status: 400 });
        }
        await setChosenStatus(admin, userId, chosen);
        break;
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
      .select("user_id, username, is_chosen, admin_granted_titles")
      .ilike("username", username)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }
    const userId = data.user_id as string;
    const badges = await listUserBadges(admin, userId);
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const registeredAt = authUser?.user?.created_at
      ? new Date(authUser.user.created_at)
      : new Date();
    const titles = await getUnlockedTitles(admin, userId, registeredAt);
    return NextResponse.json({
      user: {
        userId,
        username: data.username,
        badges: badges.map((b) => b.id),
        titles,
        isChosen: Boolean(data.is_chosen),
        adminTitles: (data.admin_granted_titles as string[] | null) ?? []
      }
    });
  }

  return NextResponse.json({
    badges: Object.values(BADGES).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description
    })),
    titles: Object.values(TITLES).map((t) => ({
      id: t.id,
      label: t.label
    }))
  });
}
