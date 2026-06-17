import { QUESTS } from "./quest-catalog";

/** Shown as TikTok-style marks next to username — never in emoji showcase row. */
export const IDENTITY_BADGE_IDS = new Set([
  "verified_user",
  "mekkz_creator",
  "ultra_creator",
  "founder"
]);

export function isIdentityBadge(badgeId: string) {
  return IDENTITY_BADGE_IDS.has(badgeId);
}

export function filterShowcaseBadges<T extends { id: string }>(badges: T[]): T[] {
  return badges.filter((b) => !isIdentityBadge(b.id));
}

export function stripIdentityBadgeIds(badgeIds: string[]) {
  return badgeIds.filter((id) => !isIdentityBadge(id));
}

export function getShowcaseGroup(badgeId: string) {
  return QUESTS[badgeId]?.showcaseGroup ?? null;
}

/** Tier groups (chat_milestones, follower_milestones) allow only one badge; others unlimited. */
export function toggleShowcaseBadge(currentIds: string[], badgeId: string): string[] {
  if (isIdentityBadge(badgeId)) return currentIds;
  const group = getShowcaseGroup(badgeId);
  if (!group) {
    return currentIds.includes(badgeId)
      ? currentIds.filter((id) => id !== badgeId)
      : [...currentIds, badgeId];
  }
  const withoutGroup = currentIds.filter((id) => getShowcaseGroup(id) !== group);
  if (currentIds.includes(badgeId)) return withoutGroup;
  return [...withoutGroup, badgeId];
}

export function validateShowcaseBadgeIds(badgeIds: string[], owned: Set<string>) {
  const valid = stripIdentityBadgeIds(badgeIds).filter((id) => owned.has(id));
  const seenGroups = new Set<string>();
  const result: string[] = [];
  for (const id of valid) {
    const group = getShowcaseGroup(id);
    if (group) {
      if (seenGroups.has(group)) continue;
      seenGroups.add(group);
    }
    result.push(id);
  }
  return result;
}
