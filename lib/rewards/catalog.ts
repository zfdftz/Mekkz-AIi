import { QUESTS } from "./quest-catalog";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";
export type CosmeticRarity = BadgeRarity;
export type CosmeticType = "frame" | "theme" | "background" | "character";

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  protected?: boolean;
};

export type TitleDef = {
  id: string;
  label: string;
  locked?: boolean;
  ogOnly?: boolean;
  creatorOnly?: boolean;
  season1Only?: boolean;
};

export type CosmeticDef = {
  id: string;
  name: string;
  type: CosmeticType;
  rarity: CosmeticRarity;
  seasonIndex: number;
  previewClass: string;
};

export type SeasonDef = {
  index: number;
  id: string;
  name: string;
  theme: string;
  description: string;
  accent: string;
};

export const BADGES: Record<string, BadgeDef> = Object.fromEntries(
  Object.entries(QUESTS).map(([id, q]) => [
    id,
    { id: q.id, name: q.name, description: q.description, icon: q.icon, protected: q.protected }
  ])
);

export const TITLES: Record<string, TitleDef> = {
  founder: { id: "founder", label: "Founder" },
  developer: { id: "developer", label: "Developer" },
  designer: { id: "designer", label: "Designer" },
  storyteller: { id: "storyteller", label: "Storyteller" },
  og_member: { id: "og_member", label: "OG Member", ogOnly: true },
  beta_tester: { id: "beta_tester", label: "Beta Tester" },
  mekkz_ai_creator: {
    id: "mekkz_ai_creator",
    label: "Mekkz AI Creator",
    creatorOnly: true
  },
  cosmic_genesis: {
    id: "cosmic_genesis",
    label: "Cosmic Genesis",
    season1Only: true
  },
  social_star: { id: "social_star", label: "Social Star" },
  ultra_creator: { id: "ultra_creator", label: "Ultra Creator" },
  season_2: { id: "season_2", label: "Cyber Future" },
  season_3: { id: "season_3", label: "Mythic Kingdoms" },
  season_4: { id: "season_4", label: "Frozen Legends" },
  season_5: { id: "season_5", label: "Inferno Rising" }
};

export const SEASONS: SeasonDef[] = [
  {
    index: 0,
    id: "cosmic-genesis",
    name: "Cosmic Genesis",
    theme: "Space · Galaxies · Stars · Nebulas",
    description: "Galaxien, Sterne und Nebel.",
    accent: "#6366f1"
  },
  {
    index: 1,
    id: "cyber-future",
    name: "Cyber Future",
    theme: "Neon Cities · Cyberpunk · Technology",
    description: "Neon, Cyberpunk und Tech.",
    accent: "#06b6d4"
  },
  {
    index: 2,
    id: "mythic-kingdoms",
    name: "Mythic Kingdoms",
    theme: "Castles · Dragons · Fantasy",
    description: "Burgen, Drachen, Fantasy.",
    accent: "#a855f7"
  },
  {
    index: 3,
    id: "frozen-legends",
    name: "Frozen Legends",
    theme: "Ice · Snow · Winter",
    description: "Eis, Schnee und Winter.",
    accent: "#38bdf8"
  },
  {
    index: 4,
    id: "inferno-rising",
    name: "Inferno Rising",
    theme: "Fire · Lava · Volcanoes",
    description: "Feuer, Lava und Vulkane.",
    accent: "#f97316"
  }
];

function cosmetic(
  id: string,
  name: string,
  type: CosmeticType,
  rarity: CosmeticRarity,
  seasonIndex: number,
  previewClass: string
): CosmeticDef {
  return { id, name, type, rarity, seasonIndex, previewClass };
}

export const COSMETICS: CosmeticDef[] = [
  // Season 0 — Cosmic Genesis
  cosmetic("frame-galaxy-ring", "Galaxy Ring", "frame", "rare", 0, "reward-frame-galaxy"),
  cosmetic("frame-star-orbit", "Star Orbit", "frame", "epic", 0, "reward-frame-stars"),
  cosmetic("bg-nebula-drift", "Nebula Drift", "background", "rare", 0, "reward-bg-nebula"),
  cosmetic("bg-cosmic-void", "Cosmic Void", "background", "legendary", 0, "reward-bg-void"),
  cosmetic("theme-cosmic", "Cosmic Theme", "theme", "epic", 0, "reward-theme-cosmic"),
  cosmetic("char-nova", "Nova Guide", "character", "legendary", 0, "reward-char-nova"),
  // Season 1 — Cyber Future
  cosmetic("frame-neon-grid", "Neon Grid", "frame", "rare", 1, "reward-frame-neon"),
  cosmetic("frame-cyber-pulse", "Cyber Pulse", "frame", "epic", 1, "reward-frame-cyber"),
  cosmetic("bg-neon-city", "Neon City", "background", "rare", 1, "reward-bg-neon"),
  cosmetic("bg-digital-rain", "Digital Rain", "background", "legendary", 1, "reward-bg-rain"),
  cosmetic("theme-cyber", "Cyber Theme", "theme", "epic", 1, "reward-theme-cyber"),
  cosmetic("char-byte", "Byte Agent", "character", "legendary", 1, "reward-char-byte"),
  // Season 2 — Mythic Kingdoms
  cosmetic("frame-royal-gold", "Royal Gold", "frame", "rare", 2, "reward-frame-royal"),
  cosmetic("frame-dragon-scale", "Dragon Scale", "frame", "epic", 2, "reward-frame-dragon"),
  cosmetic("bg-castle-mist", "Castle Mist", "background", "rare", 2, "reward-bg-castle"),
  cosmetic("bg-dragon-sky", "Dragon Sky", "background", "legendary", 2, "reward-bg-dragon"),
  cosmetic("theme-mythic", "Mythic Theme", "theme", "epic", 2, "reward-theme-mythic"),
  cosmetic("char-sage", "Realm Sage", "character", "legendary", 2, "reward-char-sage"),
  // Season 3 — Frozen Legends
  cosmetic("frame-ice-crystal", "Ice Crystal", "frame", "rare", 3, "reward-frame-ice"),
  cosmetic("frame-snow-aura", "Snow Aura", "frame", "epic", 3, "reward-frame-snow"),
  cosmetic("bg-frozen-lake", "Frozen Lake", "background", "rare", 3, "reward-bg-frozen"),
  cosmetic("bg-blizzard", "Blizzard", "background", "legendary", 3, "reward-bg-blizzard"),
  cosmetic("theme-frozen", "Frozen Theme", "theme", "epic", 3, "reward-theme-frozen"),
  cosmetic("char-frost", "Frost Spirit", "character", "legendary", 3, "reward-char-frost"),
  // Season 4 — Inferno Rising
  cosmetic("frame-ember-ring", "Ember Ring", "frame", "rare", 4, "reward-frame-ember"),
  cosmetic("frame-inferno", "Inferno Crown", "frame", "epic", 4, "reward-frame-inferno"),
  cosmetic("bg-lava-flow", "Lava Flow", "background", "rare", 4, "reward-bg-lava"),
  cosmetic("bg-volcano", "Volcano Core", "background", "legendary", 4, "reward-bg-volcano"),
  cosmetic("theme-inferno", "Inferno Theme", "theme", "epic", 4, "reward-theme-inferno"),
  cosmetic("char-ember", "Ember Warden", "character", "legendary", 4, "reward-char-ember"),
  // Evergreen commons
  cosmetic("frame-classic", "Classic Frame", "frame", "common", -1, "reward-frame-classic"),
  cosmetic("bg-mekkz", "Mekkz Gradient", "background", "common", -1, "reward-bg-mekkz"),
  cosmetic("theme-violet", "Violet Theme", "theme", "common", -1, "reward-theme-violet"),
  // Badge-unlock backgrounds
  cosmetic("bg-chat-aurora", "Chat Aurora", "background", "rare", -1, "reward-bg-chat-aurora"),
  cosmetic("bg-chat-deep", "Deep Space Chat", "background", "rare", -1, "reward-bg-chat-deep"),
  cosmetic("bg-community-glow", "Community Glow", "background", "rare", -1, "reward-bg-community-glow"),
  cosmetic("bg-starfield", "Starfield Social", "background", "epic", -1, "reward-bg-starfield"),
  cosmetic("bg-loyalty-gold", "Loyalty Gold", "background", "rare", -1, "reward-bg-loyalty-gold"),
  cosmetic("bg-treasure-vault", "Treasure Vault", "background", "epic", -1, "reward-bg-treasure-vault"),
  cosmetic("bg-midnight-blue", "Midnight Owl", "background", "rare", -1, "reward-bg-midnight-blue"),
  cosmetic("bg-creative-burst", "Creative Burst", "background", "epic", -1, "reward-bg-creative-burst"),
  cosmetic("bg-circuit-mind", "Circuit Mind", "background", "epic", -1, "reward-bg-circuit-mind"),
  cosmetic("bg-genesis-bloom", "Genesis Bloom", "background", "legendary", -1, "reward-bg-genesis-bloom"),
  cosmetic("bg-beta-pulse", "Beta Pulse", "background", "rare", -1, "reward-bg-beta-pulse"),
  // Extra crate backgrounds
  cosmetic("bg-aurora-borealis", "Aurora Borealis", "background", "rare", -1, "reward-bg-aurora-borealis"),
  cosmetic("bg-sunset-dream", "Sunset Dream", "background", "rare", -1, "reward-bg-sunset-dream"),
  cosmetic("bg-ocean-depths", "Ocean Depths", "background", "rare", -1, "reward-bg-ocean-depths"),
  cosmetic("bg-forest-mist", "Forest Mist", "background", "rare", -1, "reward-bg-forest-mist"),
  cosmetic("bg-cherry-blossom", "Cherry Blossom", "background", "epic", -1, "reward-bg-cherry-blossom"),
  cosmetic("bg-golden-hour", "Golden Hour", "background", "rare", -1, "reward-bg-golden-hour"),
  cosmetic("bg-storm-cloud", "Storm Cloud", "background", "epic", -1, "reward-bg-storm-cloud"),
  cosmetic("bg-crystal-cave", "Crystal Cave", "background", "epic", -1, "reward-bg-crystal-cave"),
  cosmetic("bg-desert-dusk", "Desert Dusk", "background", "rare", -1, "reward-bg-desert-dusk"),
  cosmetic("bg-plasma-wave", "Plasma Wave", "background", "legendary", -1, "reward-bg-plasma-wave"),
  cosmetic("bg-shadow-realm", "Shadow Realm", "background", "legendary", -1, "reward-bg-shadow-realm"),
  cosmetic("bg-ember-glow", "Ember Glow", "background", "rare", -1, "reward-bg-ember-glow"),
  // New profile backgrounds — 10 normal (common/rare)
  cosmetic("bg-soft-lilac", "Soft Lilac", "background", "common", -1, "reward-bg-soft-lilac"),
  cosmetic("bg-mint-frost", "Mint Frost", "background", "common", -1, "reward-bg-mint-frost"),
  cosmetic("bg-warm-latte", "Warm Latte", "background", "common", -1, "reward-bg-warm-latte"),
  cosmetic("bg-sky-dawn", "Sky Dawn", "background", "common", -1, "reward-bg-sky-dawn"),
  cosmetic("bg-charcoal-silk", "Charcoal Silk", "background", "common", -1, "reward-bg-charcoal-silk"),
  cosmetic("bg-moonlit-sea", "Moonlit Sea", "background", "rare", -1, "reward-bg-moonlit-sea"),
  cosmetic("bg-autumn-leaves", "Autumn Leaves", "background", "rare", -1, "reward-bg-autumn-leaves"),
  cosmetic("bg-bamboo-grove", "Bamboo Grove", "background", "rare", -1, "reward-bg-bamboo-grove"),
  cosmetic("bg-velvet-night", "Velvet Night", "background", "rare", -1, "reward-bg-velvet-night"),
  cosmetic("bg-coral-reef", "Coral Reef", "background", "rare", -1, "reward-bg-coral-reef"),
  // New — 10 epic & legendary
  cosmetic("bg-lightning-rift", "Lightning Rift", "background", "epic", -1, "reward-bg-lightning-rift"),
  cosmetic("bg-deep-jellyfish", "Deep Jellyfish", "background", "epic", -1, "reward-bg-deep-jellyfish"),
  cosmetic("bg-phoenix-flame", "Phoenix Flame", "background", "epic", -1, "reward-bg-phoenix-flame"),
  cosmetic("bg-enchanted-grove", "Enchanted Grove", "background", "epic", -1, "reward-bg-enchanted-grove"),
  cosmetic("bg-synthwave-horizon", "Synthwave Horizon", "background", "epic", -1, "reward-bg-synthwave-horizon"),
  cosmetic("bg-supernova", "Supernova Burst", "background", "legendary", -1, "reward-bg-supernova"),
  cosmetic("bg-abyssal-deep", "Abyssal Deep", "background", "legendary", -1, "reward-bg-abyssal-deep"),
  cosmetic("bg-hellforge", "Hellforge", "background", "legendary", -1, "reward-bg-hellforge"),
  cosmetic("bg-stargate", "Stargate", "background", "legendary", -1, "reward-bg-stargate"),
  cosmetic("bg-queen-aurora", "Queen Aurora", "background", "legendary", -1, "reward-bg-queen-aurora")
];

/** Profile backgrounds granted when a badge is earned (idempotent via inventory PK). */
export const BADGE_BACKGROUND_REWARDS: Record<string, string> = {
  first_chat: "bg-chat-aurora",
  chats_100: "bg-chat-deep",
  first_community_post: "bg-community-glow",
  social_star: "bg-starfield",
  loyal_member: "bg-loyalty-gold",
  crate_hunter: "bg-treasure-vault",
  night_owl: "bg-midnight-blue",
  creative_mind: "bg-creative-burst",
  ai_expert: "bg-circuit-mind",
  beta_tester: "bg-beta-pulse"
};

export function getCosmetic(id: string) {
  return COSMETICS.find((c) => c.id === id);
}

export function getBadge(id: string) {
  return BADGES[id];
}

export function getTitle(id: string) {
  return TITLES[id];
}

const FRAME_AS_BG: Record<string, string> = {
  "frame-galaxy-ring": "reward-bg-galaxy-ring",
  "frame-star-orbit": "reward-bg-star-orbit",
  "frame-neon-grid": "reward-bg-neon-ring",
  "frame-cyber-pulse": "reward-bg-cyber-ring",
  "frame-royal-gold": "reward-bg-royal-ring",
  "frame-dragon-scale": "reward-bg-dragon-ring",
  "frame-ice-crystal": "reward-bg-ice-ring",
  "frame-snow-aura": "reward-bg-snow-ring",
  "frame-ember-ring": "reward-bg-ember-ring",
  "frame-inferno": "reward-bg-inferno-ring",
  "frame-classic": "reward-bg-mekkz"
};

/** Profile card background — frames render as full backgrounds like Discord. */
export function resolveEquippedStyleId(
  profileBackground: string | null | undefined,
  profileFrame: string | null | undefined
) {
  return profileBackground ?? profileFrame ?? null;
}

export function getProfileBackgroundClass(cosmeticId: string | null | undefined) {
  if (!cosmeticId) return "";
  const def = getCosmetic(cosmeticId);
  if (!def) return "";
  if (def.type === "background") return def.previewClass;
  if (def.type === "frame") return FRAME_AS_BG[def.id] ?? def.previewClass;
  return def.previewClass;
}

export const RARITY_WEIGHTS: Record<CosmeticRarity, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5
};
