import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  banUser,
  deleteUserAccount,
  sendUserWarning,
  unbanUser
} from "@/lib/community/moderation";
import { canManageRewards } from "@/lib/rewards/admin-access";
import { adminGrantAllBadges, grantBadge, listUserBadges, revokeBadge } from "@/lib/rewards/badges";
import {
  adminGrantAllStyleItems,
  adminGrantAllTitles,
  adminGrantCosmetic,
  adminGrantTitle,
  adminRevokeCosmetic,
  adminRevokeTitle,
  getUnlockedTitles,
  listInventory
} from "@/lib/rewards/cosmetics";
import { BADGES, COSMETICS, TITLES } from "@/lib/rewards/catalog";
import { normalizeUsername } from "@/lib/community/profile-rules";
import { adminSetIdentityFlags, getVerificationFlags, setChosenStatus } from "@/lib/rewards/verification";
import {
  adminGrantPlan,
  adminRevokePlan,
  resolveEntitledPlan,
  type AdminPlanDuration
} from "@/lib/user-plans";
import type { PlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

function escapeLikePattern(raw: string) {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum([
    "grant-badge",
    "revoke-badge",
    "grant-title",
    "revoke-title",
    "grant-cosmetic",
    "revoke-cosmetic",
    "grant-plan",
    "revoke-plan",
    "set-chosen",
    "set-identity",
    "grant-all",
    "send-warning",
    "ban",
    "unban",
    "delete-account"
  ]),
  badgeId: z.string().optional(),
  titleId: z.string().optional(),
  cosmeticId: z.string().optional(),
  plan: z.enum(["plus", "pro", "ultra"]).optional(),
  duration: z.enum(["3d", "7d", "30d", "365d", "lifetime"]).optional(),
  chosen: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isCreator: z.boolean().optional(),
  isUltraCreator: z.boolean().optional(),
  isChosen: z.boolean().optional(),
  warningMessage: z.string().max(500).optional(),
  banDays: z.number().int().min(1).max(365).optional()
});

async function buildUserPayload(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select(
      "username, is_chosen, is_verified, is_creator, is_ultra_creator, admin_granted_titles, moderation_warning, banned_until"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;

  const badges = await listUserBadges(admin, userId);
  const inventory = await listInventory(admin, userId);
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const registeredAt = authUser?.user?.created_at
    ? new Date(authUser.user.created_at)
    : new Date();
  const titles = await getUnlockedTitles(admin, userId, registeredAt);
  const flags = await getVerificationFlags(admin, userId);
  const { data: planRow } = await admin
    .from("user_plans")
    .select("plan, stripe_period_end, stripe_subscription_status")
    .eq("user_id", userId)
    .maybeSingle();
  const entitledPlan = resolveEntitledPlan(
    planRow
      ? {
          user_id: userId,
          plan: planRow.plan as string,
          images_today: 0,
          usage_day: "",
          stripe_period_end: planRow.stripe_period_end as string | null,
          stripe_subscription_status: planRow.stripe_subscription_status as string | null
        }
      : null
  );

  return {
    userId,
    username: profile.username as string | null,
    badges: badges.map((b) => b.id),
    inventory: inventory.map((item) => item.id),
    titles,
    isChosen: flags.isChosen,
    isVerified: flags.isVerified,
    isCreator: flags.isCreator,
    isUltraCreator: flags.isUltraCreator,
    isFounder: flags.isFounder,
    adminTitles: (profile.admin_granted_titles as string[] | null) ?? [],
    moderationWarning: (profile.moderation_warning as string | null) ?? null,
    bannedUntil: (profile.banned_until as string | null) ?? null,
    plan: entitledPlan,
    planPeriodEnd: (planRow?.stripe_period_end as string | null) ?? null
  };
}

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

  const {
    userId,
    action,
    badgeId,
    titleId,
    cosmeticId,
    plan,
    duration,
    chosen,
    isVerified,
    isCreator,
    isUltraCreator,
    isChosen,
    warningMessage,
    banDays
  } = parsed.data;

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
      case "grant-cosmetic":
        if (!cosmeticId || !COSMETICS.find((c) => c.id === cosmeticId)) {
          return NextResponse.json({ error: "Unbekannter Hintergrund." }, { status: 400 });
        }
        await adminGrantCosmetic(admin, userId, cosmeticId);
        break;
      case "revoke-cosmetic":
        if (!cosmeticId || !COSMETICS.find((c) => c.id === cosmeticId)) {
          return NextResponse.json({ error: "Unbekannter Hintergrund." }, { status: 400 });
        }
        await adminRevokeCosmetic(admin, userId, cosmeticId);
        break;
      case "grant-plan": {
        if (!plan) {
          return NextResponse.json({ error: "Plan fehlt." }, { status: 400 });
        }
        const grantDuration = (duration ?? "30d") as AdminPlanDuration;
        await adminGrantPlan(admin, userId, plan as PlanId, grantDuration);
        break;
      }
      case "revoke-plan":
        await adminRevokePlan(admin, userId);
        break;
      case "set-chosen":
        if (typeof chosen !== "boolean") {
          return NextResponse.json({ error: "chosen muss true/false sein." }, { status: 400 });
        }
        await setChosenStatus(admin, userId, chosen);
        break;
      case "set-identity":
        await adminSetIdentityFlags(admin, userId, {
          isVerified,
          isCreator,
          isUltraCreator,
          isChosen
        });
        break;
      case "grant-all":
        await adminGrantAllStyleItems(admin, userId);
        await adminGrantAllTitles(admin, userId);
        await adminGrantAllBadges(admin, userId, `admin:${auth.user!.id}`);
        break;
      case "send-warning":
        if (!warningMessage?.trim()) {
          return NextResponse.json({ error: "Warnungstext fehlt." }, { status: 400 });
        }
        await sendUserWarning(admin, userId, warningMessage);
        break;
      case "ban": {
        const days = banDays ?? 7;
        await banUser(admin, userId, days);
        break;
      }
      case "unban":
        await unbanUser(admin, userId);
        break;
      case "delete-account":
        await deleteUserAccount(admin, userId);
        return NextResponse.json({ ok: true, deleted: true });
    }
    const user = await buildUserPayload(admin, userId);
    return NextResponse.json({ ok: true, user });
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
  const userIdParam = new URL(req.url).searchParams.get("userId")?.trim();

  try {
    if (userIdParam) {
      const user = await buildUserPayload(admin, userIdParam);
      if (!user) {
        return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({ user });
    }

    if (username) {
      const normalized = normalizeUsername(username);
      if (!normalized) {
        return NextResponse.json({ error: "Benutzername erforderlich." }, { status: 400 });
      }

      const { data: exact, error: exactError } = await admin
        .from("user_profiles")
        .select("user_id, username")
        .eq("username", normalized)
        .limit(1);
      if (exactError) {
        return NextResponse.json({ error: exactError.message }, { status: 500 });
      }

      let hits = exact ?? [];
      if (hits.length === 0) {
        const prefix = `${escapeLikePattern(normalized)}%`;
        const { data: prefixHits, error: prefixError } = await admin
          .from("user_profiles")
          .select("user_id, username")
          .ilike("username", prefix)
          .order("username")
          .limit(25);
        if (prefixError) {
          return NextResponse.json({ error: prefixError.message }, { status: 500 });
        }
        hits = prefixHits ?? [];
      }

      if (!hits.length) {
        return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
      }
      if (hits.length > 1) {
        return NextResponse.json({
          users: hits.map((row) => ({
            userId: row.user_id as string,
            username: row.username as string | null
          }))
        });
      }
      const user = await buildUserPayload(admin, hits[0].user_id as string);
      if (!user) {
        return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({ user });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Datenbankfehler." },
      { status: 500 }
    );
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
    })),
    cosmetics: COSMETICS.filter((c) => c.type === "background" || c.type === "frame").map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      rarity: c.rarity
    }))
  });
}
