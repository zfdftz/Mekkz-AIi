import { QUESTS } from "./quest-catalog";

export function getShowcaseGroup(badgeId: string) {
  return QUESTS[badgeId]?.showcaseGroup ?? null;
}

/** Tier groups (chat_milestones, follower_milestones) allow only one badge; others unlimited. */
export function toggleShowcaseBadge(currentIds: string[], badgeId: string): string[] {
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
  const valid = badgeIds.filter((id) => owned.has(id));
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
