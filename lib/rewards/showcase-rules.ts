import { QUESTS } from "./quest-catalog";

export function getBadgeCategory(badgeId: string) {
  return QUESTS[badgeId]?.category ?? "special";
}

/** Only one showcased badge per category (e.g. one chat badge, not 100+500 chats). */
export function toggleShowcaseBadge(currentIds: string[], badgeId: string): string[] {
  if (!QUESTS[badgeId]) return currentIds;
  const category = getBadgeCategory(badgeId);
  const withoutCategory = currentIds.filter((id) => getBadgeCategory(id) !== category);
  if (currentIds.includes(badgeId)) return withoutCategory;
  return [...withoutCategory, badgeId];
}

export function validateShowcaseBadgeIds(badgeIds: string[], owned: Set<string>) {
  const valid = badgeIds.filter((id) => owned.has(id));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of valid) {
    const cat = getBadgeCategory(id);
    if (seen.has(cat)) continue;
    seen.add(cat);
    result.push(id);
  }
  return result;
}
