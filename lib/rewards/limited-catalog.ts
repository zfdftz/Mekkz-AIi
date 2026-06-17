export type LimitedRarity = "limited" | "rare_limited" | "legendary_limited";
export type LimitedItemType = "frame" | "banner" | "crown" | "theme" | "decoration";

export type LimitedItemDef = {
  id: string;
  name: string;
  type: LimitedItemType;
  limitedRarity: LimitedRarity;
  releasedAt: string;
  eventLabel: string;
  previewClass: string;
  seasonIndex?: number;
};

export const LIMITED_ITEMS: LimitedItemDef[] = [
  { id: "lim-frame-og2026", name: "OG 2026 Frame", type: "frame", limitedRarity: "legendary_limited", releasedAt: "2026-01-01", eventLabel: "OG 2026", previewClass: "reward-lim-frame-og" },
  { id: "lim-frame-founder", name: "Founder Frame", type: "frame", limitedRarity: "legendary_limited", releasedAt: "2026-01-01", eventLabel: "Founder", previewClass: "reward-lim-frame-founder" },
  { id: "lim-frame-beta", name: "Beta Tester Frame", type: "frame", limitedRarity: "rare_limited", releasedAt: "2026-03-01", eventLabel: "Beta", previewClass: "reward-lim-frame-beta" },
  { id: "lim-frame-cosmic", name: "Cosmic Founder Frame", type: "frame", limitedRarity: "legendary_limited", releasedAt: "2026-06-17", eventLabel: "Season 1", previewClass: "reward-lim-frame-cosmic", seasonIndex: 0 },
  { id: "lim-frame-season1", name: "Season One Frame", type: "frame", limitedRarity: "limited", releasedAt: "2026-06-17", eventLabel: "Season 1", previewClass: "reward-lim-frame-s1", seasonIndex: 0 },
  { id: "lim-frame-early", name: "Early Supporter Frame", type: "frame", limitedRarity: "rare_limited", releasedAt: "2026-06-01", eventLabel: "Early Supporter", previewClass: "reward-lim-frame-early" },
  { id: "lim-banner-founder", name: "Founder Banner", type: "banner", limitedRarity: "legendary_limited", releasedAt: "2026-01-01", eventLabel: "Founder", previewClass: "reward-lim-banner-founder" },
  { id: "lim-banner-og", name: "OG Member Banner", type: "banner", limitedRarity: "legendary_limited", releasedAt: "2026-01-01", eventLabel: "OG Member", previewClass: "reward-lim-banner-og" },
  { id: "lim-banner-s1", name: "First Season Banner", type: "banner", limitedRarity: "limited", releasedAt: "2026-06-17", eventLabel: "Season 1", previewClass: "reward-lim-banner-s1", seasonIndex: 0 },
  { id: "lim-banner-creator", name: "Creator Banner", type: "banner", limitedRarity: "legendary_limited", releasedAt: "2026-01-01", eventLabel: "Creator", previewClass: "reward-lim-banner-creator" },
  { id: "lim-banner-legacy", name: "Legacy Banner", type: "banner", limitedRarity: "rare_limited", releasedAt: "2026-06-17", eventLabel: "Legacy", previewClass: "reward-lim-banner-legacy" },
  { id: "lim-banner-beta", name: "Beta Banner", type: "banner", limitedRarity: "limited", releasedAt: "2026-03-01", eventLabel: "Beta", previewClass: "reward-lim-banner-beta" },
  { id: "lim-crown-s1", name: "Season 1 Crown", type: "crown", limitedRarity: "legendary_limited", releasedAt: "2026-06-17", eventLabel: "Season 1", previewClass: "reward-lim-crown-s1", seasonIndex: 0 },
  { id: "lim-crown-founder", name: "Founder Crown", type: "crown", limitedRarity: "legendary_limited", releasedAt: "2026-01-01", eventLabel: "Founder", previewClass: "reward-lim-crown-founder" },
  { id: "lim-crown-creator", name: "Creator Crown", type: "crown", limitedRarity: "legendary_limited", releasedAt: "2026-01-01", eventLabel: "Creator", previewClass: "reward-lim-crown-creator" },
  { id: "lim-crown-legacy", name: "Legacy Crown", type: "crown", limitedRarity: "rare_limited", releasedAt: "2026-06-17", eventLabel: "Legacy", previewClass: "reward-lim-crown-legacy" },
  { id: "lim-crown-community", name: "Community Crown", type: "crown", limitedRarity: "limited", releasedAt: "2026-06-17", eventLabel: "Community", previewClass: "reward-lim-crown-community" }
];

export function getLimitedItem(id: string) {
  return LIMITED_ITEMS.find((i) => i.id === id);
}

export function isLimitedObtainable(item: LimitedItemDef, seasonIndex: number) {
  if (item.seasonIndex != null) return item.seasonIndex === seasonIndex;
  return true;
}
