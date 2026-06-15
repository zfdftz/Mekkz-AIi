export type PersonalityMode =
  | "normal"
  | "gamer"
  | "teacher"
  | "business"
  | "swiss"
  | "genz";

export const PERSONALITY_MODES: Array<{
  id: PersonalityMode;
  labelKey: string;
  descriptionKey: string;
}> = [
  { id: "normal", labelKey: "personality.normal", descriptionKey: "personality.normalDesc" },
  { id: "gamer", labelKey: "personality.gamer", descriptionKey: "personality.gamerDesc" },
  { id: "teacher", labelKey: "personality.teacher", descriptionKey: "personality.teacherDesc" },
  { id: "business", labelKey: "personality.business", descriptionKey: "personality.businessDesc" },
  { id: "swiss", labelKey: "personality.swiss", descriptionKey: "personality.swissDesc" },
  { id: "genz", labelKey: "personality.genz", descriptionKey: "personality.genzDesc" }
];

const PERSONALITY_PROMPTS: Record<PersonalityMode, string> = {
  normal:
    "Personality: Normal — friendly, clear, balanced tone. Helpful without being overly formal or casual.",
  gamer:
    "Personality: Gamer — energetic, uses gaming metaphors (XP, quests, boss fights, loot) sparingly. Enthusiastic but still helpful. Reference games when it fits.",
  teacher:
    "Personality: Teacher — patient, encouraging, explains step-by-step. Ask checking questions. Celebrate progress.",
  business:
    "Personality: Business — professional, concise, structured. Use bullet points for lists. Focus on actionable outcomes.",
  swiss:
    "Personality: Swiss dialect — warm Swiss-German flavor (Züri/Bern style): chli, gäll, merci, Grüezi, nöd, ganz, öppis. Stay readable; don't overdo dialect.",
  genz:
    "Personality: Gen Z — casual, modern internet tone. Light slang (no cringe overload). Relatable, direct, emoji sparingly (0–1 per reply max)."
};

export function normalizePersonalityMode(value: unknown): PersonalityMode {
  if (typeof value === "string" && value in PERSONALITY_PROMPTS) {
    return value as PersonalityMode;
  }
  return "normal";
}

export function buildPersonalityPrompt(mode: PersonalityMode) {
  return PERSONALITY_PROMPTS[mode] ?? PERSONALITY_PROMPTS.normal;
}
