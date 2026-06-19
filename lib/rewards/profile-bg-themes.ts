/** Maps reward-bg CSS class → themed FX profile for epic/legendary motion layers. */
export type ProfileBgTheme =
  | "volcano"
  | "lava"
  | "inferno"
  | "blizzard"
  | "frozen"
  | "ice"
  | "rain"
  | "neon"
  | "cyber"
  | "dragon"
  | "void"
  | "nebula"
  | "galaxy"
  | "starfield"
  | "genesis"
  | "plasma"
  | "shadow"
  | "storm"
  | "cherry"
  | "crystal"
  | "circuit"
  | "burst"
  | "treasure"
  | "phoenix"
  | "jellyfish"
  | "lightning"
  | "grove"
  | "synthwave"
  | "supernova"
  | "abyss"
  | "hellforge"
  | "stargate"
  | "aurora"
  | "ocean"
  | "castle"
  | "ember"
  | "default";

const CLASS_TO_THEME: Record<string, ProfileBgTheme> = {
  "reward-bg-volcano": "volcano",
  "reward-bg-lava": "lava",
  "reward-bg-inferno-ring": "inferno",
  "reward-bg-ember-ring": "ember",
  "reward-bg-blizzard": "blizzard",
  "reward-bg-frozen": "frozen",
  "reward-bg-ice-ring": "ice",
  "reward-bg-snow-ring": "frozen",
  "reward-bg-rain": "rain",
  "reward-bg-neon": "neon",
  "reward-bg-neon-ring": "neon",
  "reward-bg-cyber-ring": "cyber",
  "reward-bg-dragon": "dragon",
  "reward-bg-dragon-ring": "dragon",
  "reward-bg-void": "void",
  "reward-bg-nebula": "nebula",
  "reward-bg-galaxy-ring": "galaxy",
  "reward-bg-star-orbit": "galaxy",
  "reward-bg-starfield": "starfield",
  "reward-bg-genesis-bloom": "genesis",
  "reward-bg-plasma-wave": "plasma",
  "reward-bg-shadow-realm": "shadow",
  "reward-bg-storm-cloud": "storm",
  "reward-bg-cherry-blossom": "cherry",
  "reward-bg-crystal-cave": "crystal",
  "reward-bg-circuit-mind": "circuit",
  "reward-bg-creative-burst": "burst",
  "reward-bg-treasure-vault": "treasure",
  "reward-bg-phoenix-flame": "phoenix",
  "reward-bg-deep-jellyfish": "jellyfish",
  "reward-bg-lightning-rift": "lightning",
  "reward-bg-enchanted-grove": "grove",
  "reward-bg-synthwave-horizon": "synthwave",
  "reward-bg-supernova": "supernova",
  "reward-bg-abyssal-deep": "abyss",
  "reward-bg-hellforge": "hellforge",
  "reward-bg-stargate": "stargate",
  "reward-bg-queen-aurora": "aurora",
  "reward-bg-ocean-depths": "ocean",
  "reward-bg-castle-mist": "castle",
  "reward-bg-ember-glow": "ember"
};

export function resolveProfileBgTheme(previewClass: string): ProfileBgTheme {
  return CLASS_TO_THEME[previewClass] ?? "default";
}
