import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserBadge } from "./badges";
import { getShowcasedBadges, listUserBadges } from "./badges";
import { getProfileCosmetics } from "./cosmetics";
import { getVerificationFlags } from "./verification";

export type AuthorIdentity = {
  isVerified: boolean;
  isCreator: boolean;
  isChosen: boolean;
  isUltraCreator: boolean;
  isFounder: boolean;
  titleLabel: string | null;
  showcasedBadges: UserBadge[];
  accentColor: string;
};

export type AuthorFields = {
  authorTitle?: string | null;
  authorVerified?: boolean;
  authorCreator?: boolean;
  authorChosen?: boolean;
  authorUltraCreator?: boolean;
};

export function authorFieldsFromIdentity(id: AuthorIdentity | undefined): AuthorFields {
  return {
    authorTitle: id?.titleLabel ?? null,
    authorVerified: id?.isVerified ?? false,
    authorCreator: id?.isCreator ?? false,
    authorChosen: id?.isChosen ?? false,
    authorUltraCreator: id?.isUltraCreator ?? false
  };
}

export async function enrichWithAuthorFields<T extends { userId: string }>(
  admin: SupabaseClient,
  items: T[]
): Promise<(T & AuthorFields)[]> {
  if (items.length === 0) return [];
  const map = await getAuthorIdentityMap(
    admin,
    items.map((i) => i.userId)
  );
  return items.map((item) => ({
    ...item,
    ...authorFieldsFromIdentity(map.get(item.userId))
  }));
}

export async function enrichSendersWithAuthorFields<
  T extends { senderId: string }
>(admin: SupabaseClient, items: T[]): Promise<(T & AuthorFields & { authorName?: string | null })[]> {
  if (items.length === 0) return [];
  const ids = [...new Set(items.map((i) => i.senderId))];
  const map = await getAuthorIdentityMap(admin, ids);
  return items.map((item) => ({
    ...item,
    ...authorFieldsFromIdentity(map.get(item.senderId))
  }));
}

export async function getAuthorIdentity(
  admin: SupabaseClient,
  userId: string
): Promise<AuthorIdentity> {
  const [flags, cosmetics, showcased] = await Promise.all([
    getVerificationFlags(admin, userId),
    getProfileCosmetics(admin, userId),
    getShowcasedBadges(admin, userId)
  ]);
  return {
    isVerified: flags.isVerified,
    isCreator: flags.isCreator,
    isChosen: flags.isChosen,
    isUltraCreator: flags.isUltraCreator,
    isFounder: flags.isFounder,
    titleLabel: cosmetics.activeTitleLabel,
    showcasedBadges: showcased,
    accentColor: cosmetics.accentColor
  };
}

export async function getAuthorIdentityMap(admin: SupabaseClient, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, AuthorIdentity>();
  await Promise.all(
    unique.map(async (id) => {
      map.set(id, await getAuthorIdentity(admin, id));
    })
  );
  return map;
}

export async function getFullRewardsProfile(admin: SupabaseClient, userId: string) {
  const [badges, showcased, cosmetics, flags] = await Promise.all([
    listUserBadges(admin, userId),
    getShowcasedBadges(admin, userId),
    getProfileCosmetics(admin, userId),
    getVerificationFlags(admin, userId)
  ]);
  return { badges, showcased, cosmetics, ...flags };
}
