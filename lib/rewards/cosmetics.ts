import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COSMETICS,
  getCosmetic,
  getTitle,
  TITLES,
  RARITY_WEIGHTS,
  type CosmeticDef,
  type CosmeticRarity
} from "./catalog";
import { CRATE_COOLDOWN_MS } from "./constants";
import { QUESTS } from "./quest-catalog";
import { getCurrentSeasonInfo } from "./seasons";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export type InventoryItem = CosmeticDef & { acquiredAt: string; legacy?: boolean };

export async function listInventory(admin: SupabaseClient, userId: string): Promise<InventoryItem[]> {
  const { data, error } = await admin
    .from("user_inventory")
    .select("*")
    .eq("user_id", userId)
    .order("acquired_at", { ascending: false });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  const season = getCurrentSeasonInfo();
  return (data ?? [])
    .map((row) => {
      const def = getCosmetic(row.item_id as string);
      if (!def) return null;
      return {
        ...def,
        acquiredAt: row.acquired_at as string,
        legacy:
          row.season_index != null &&
          row.season_index !== season.index &&
          (row.season_index as number) >= 0
      };
    })
    .filter(Boolean) as InventoryItem[];
}

export async function addToInventory(
  admin: SupabaseClient,
  userId: string,
  item: CosmeticDef,
  seasonIndex: number
) {
  const { error } = await admin.from("user_inventory").upsert({
    user_id: userId,
    item_id: item.id,
    item_type: item.type,
    rarity: item.rarity,
    season_index: seasonIndex
  });
  if (error && !missing(error.message)) throw new Error(error.message);
}

function pickRarity(): CosmeticRarity {
  const roll = Math.random() * 100;
  let acc = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [CosmeticRarity, number][]) {
    acc += weight;
    if (roll <= acc) return rarity;
  }
  return "common";
}

function pickCrateItem(seasonIndex: number, legacyIndices: number[]): CosmeticDef {
  const season = getCurrentSeasonInfo();
  const pool = COSMETICS.filter(
    (c) =>
      c.rarity !== "common" &&
      (c.seasonIndex === seasonIndex ||
        legacyIndices.includes(c.seasonIndex) ||
        c.seasonIndex === -1)
  );
  const rarity = pickRarity();
  const candidates = pool.filter((c) => c.rarity === rarity);
  const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
  return pick ?? COSMETICS[0];
}

export async function getCrateState(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from("user_crate_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const last = data?.last_opened_at ? new Date(data.last_opened_at as string).getTime() : 0;
  const elapsed = Date.now() - last;
  const canOpen = elapsed >= CRATE_COOLDOWN_MS;
  const cooldownMs = canOpen ? 0 : CRATE_COOLDOWN_MS - elapsed;
  return {
    canOpen,
    cooldownMs,
    totalOpens: (data?.total_opens as number) ?? 0,
    nextOpenAt: canOpen ? null : new Date(last + CRATE_COOLDOWN_MS).toISOString()
  };
}

export async function openDailyCrate(admin: SupabaseClient, userId: string) {
  const state = await getCrateState(admin, userId);
  if (!state.canOpen) {
    throw new Error("Crate noch im Cooldown.");
  }

  const season = getCurrentSeasonInfo();
  const item = pickCrateItem(season.index, season.legacySeasonIndices);
  await addToInventory(admin, userId, item, season.index);

  await admin.from("user_crate_state").upsert({
    user_id: userId,
    last_opened_at: new Date().toISOString(),
    total_opens: state.totalOpens + 1
  });

  return { item, rarity: item.rarity, season: season.current.name };
}

export type ProfileCosmetics = {
  bannerUrl: string | null;
  profileFrame: string | null;
  profileBackground: string | null;
  accentColor: string;
  activeTitle: string | null;
  activeTitleLabel: string | null;
  animatedAvatar: boolean;
};

export async function getProfileCosmetics(
  admin: SupabaseClient,
  userId: string
): Promise<ProfileCosmetics> {
  const { data } = await admin
    .from("user_profiles")
    .select(
      "banner_url, profile_frame, profile_background, accent_color, active_title, animated_avatar"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const titleId = (data?.active_title as string) ?? null;
  return {
    bannerUrl: (data?.banner_url as string) ?? null,
    profileFrame: (data?.profile_frame as string) ?? null,
    profileBackground: (data?.profile_background as string) ?? null,
    accentColor: (data?.accent_color as string) ?? "#8b5cf6",
    activeTitle: titleId,
    activeTitleLabel: titleId ? (getTitle(titleId)?.label ?? null) : null,
    animatedAvatar: Boolean(data?.animated_avatar)
  };
}

export async function updateProfileCosmetics(
  admin: SupabaseClient,
  userId: string,
  patch: Partial<{
    bannerUrl: string | null;
    profileFrame: string | null;
    profileBackground: string | null;
    accentColor: string;
    activeTitle: string | null;
    animatedAvatar: boolean;
    showcasedBadgeIds: string[];
  }>
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.bannerUrl !== undefined) payload.banner_url = patch.bannerUrl;
  if (patch.profileFrame !== undefined) payload.profile_frame = patch.profileFrame;
  if (patch.profileBackground !== undefined) payload.profile_background = patch.profileBackground;
  if (patch.accentColor !== undefined) payload.accent_color = patch.accentColor;
  if (patch.activeTitle !== undefined) {
    if (patch.activeTitle) {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const registeredAt = authUser?.user?.created_at
        ? new Date(authUser.user.created_at)
        : new Date();
      const allowed = await getUnlockedTitles(admin, userId, registeredAt);
      if (!allowed.includes(patch.activeTitle)) {
        throw new Error("Titel noch nicht freigeschaltet.");
      }
    }
    payload.active_title = patch.activeTitle;
  }
  if (patch.animatedAvatar !== undefined) payload.animated_avatar = patch.animatedAvatar;
  if (patch.showcasedBadgeIds !== undefined) payload.showcased_badge_ids = patch.showcasedBadgeIds;

  const { error } = await admin.from("user_profiles").update(payload).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return getProfileCosmetics(admin, userId);
}

export async function getUnlockedTitles(admin: SupabaseClient, userId: string, _registeredAt: Date) {
  const badges = await admin.from("user_badges").select("badge_id").eq("user_id", userId);
  const badgeIds = new Set((badges.data ?? []).map((b) => b.badge_id as string));
  const { data: profile } = await admin
    .from("user_profiles")
    .select("is_creator, admin_granted_titles")
    .eq("user_id", userId)
    .maybeSingle();

  const unlocked = new Set<string>();
  for (const q of Object.values(QUESTS)) {
    if (q.titleId && badgeIds.has(q.id)) unlocked.add(q.titleId);
  }
  if (profile?.is_creator || badgeIds.has("mekkz_creator")) {
    unlocked.add("mekkz_ai_creator");
    unlocked.add("founder");
  }
  for (const id of (profile?.admin_granted_titles as string[] | null) ?? []) {
    if (TITLES[id]) unlocked.add(id);
  }
  return [...unlocked];
}

export async function adminGrantTitle(admin: SupabaseClient, userId: string, titleId: string) {
  if (!TITLES[titleId]) throw new Error("Unbekannter Titel.");
  const { data } = await admin
    .from("user_profiles")
    .select("admin_granted_titles")
    .eq("user_id", userId)
    .maybeSingle();
  const current = new Set((data?.admin_granted_titles as string[] | null) ?? []);
  current.add(titleId);
  const { error } = await admin
    .from("user_profiles")
    .update({ admin_granted_titles: [...current] })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function adminRevokeTitle(admin: SupabaseClient, userId: string, titleId: string) {
  const { data } = await admin
    .from("user_profiles")
    .select("admin_granted_titles, active_title")
    .eq("user_id", userId)
    .maybeSingle();
  const current = ((data?.admin_granted_titles as string[] | null) ?? []).filter((id) => id !== titleId);
  const payload: Record<string, unknown> = { admin_granted_titles: current };
  if (data?.active_title === titleId) payload.active_title = null;
  const { error } = await admin.from("user_profiles").update(payload).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
