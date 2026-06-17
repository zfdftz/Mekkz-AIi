import type { SupabaseClient } from "@supabase/supabase-js";
import { BADGES, getBadge, type BadgeDef } from "./catalog";
import { validateShowcaseBadgeIds, filterShowcaseBadges, stripIdentityBadgeIds } from "./showcase-rules";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export type UserBadge = BadgeDef & { grantedAt: string; grantedBy: string };

export async function listUserBadges(admin: SupabaseClient, userId: string): Promise<UserBadge[]> {
  const { data, error } = await admin
    .from("user_badges")
    .select("badge_id, granted_at, granted_by")
    .eq("user_id", userId)
    .order("granted_at", { ascending: true });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? [])
    .map((row) => {
      const def = getBadge(row.badge_id as string);
      if (!def) return null;
      return {
        ...def,
        grantedAt: row.granted_at as string,
        grantedBy: row.granted_by as string
      };
    })
    .filter(Boolean) as UserBadge[];
}

export async function grantBadge(
  admin: SupabaseClient,
  userId: string,
  badgeId: string,
  grantedBy = "system"
) {
  if (!BADGES[badgeId]) return false;
  const { error } = await admin.from("user_badges").upsert({
    user_id: userId,
    badge_id: badgeId,
    granted_by: grantedBy,
    granted_at: new Date().toISOString()
  });
  if (error && !missing(error.message)) throw new Error(error.message);
  return true;
}

export async function revokeBadge(admin: SupabaseClient, userId: string, badgeId: string) {
  const def = BADGES[badgeId];
  if (def?.protected) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("is_creator")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.is_creator && (badgeId === "mekkz_creator" || badgeId === "verified_user")) {
      throw new Error("Creator-Badges können nicht entfernt werden.");
    }
  }
  const { error } = await admin
    .from("user_badges")
    .delete()
    .eq("user_id", userId)
    .eq("badge_id", badgeId);
  if (error && !missing(error.message)) throw new Error(error.message);
}

export async function updateShowcasedBadges(
  admin: SupabaseClient,
  userId: string,
  badgeIds: string[]
) {
  const owned = new Set((await listUserBadges(admin, userId)).map((b) => b.id));
  const valid = validateShowcaseBadgeIds(badgeIds, owned);
  await admin.from("user_profiles").update({ showcased_badge_ids: valid }).eq("user_id", userId);
  return valid;
}

export async function getShowcasedBadges(admin: SupabaseClient, userId: string): Promise<UserBadge[]> {
  const { data } = await admin
    .from("user_profiles")
    .select("showcased_badge_ids")
    .eq("user_id", userId)
    .maybeSingle();
  const raw = (data?.showcased_badge_ids as string[]) ?? [];
  const ids = stripIdentityBadgeIds(raw);
  if (ids.length !== raw.length) {
    await admin.from("user_profiles").update({ showcased_badge_ids: ids }).eq("user_id", userId);
  }
  const all = await listUserBadges(admin, userId);
  const map = new Map(all.map((b) => [b.id, b]));
  return filterShowcaseBadges(
    ids.map((id) => map.get(id)).filter(Boolean) as UserBadge[]
  );
}

export async function adminGrantAllBadges(admin: SupabaseClient, userId: string, grantedBy: string) {
  for (const badgeId of Object.keys(BADGES)) {
    await grantBadge(admin, userId, badgeId, grantedBy);
  }
}
