import type { LanguageCode } from "@/lib/languages";

export type PersonalityMode =
  | "normal"
  | "gamer"
  | "teacher"
  | "business"
  | "swiss"
  | "genz"
  | "hardcore_coach"
  | "philosopher"
  | "comedian"
  | "hype"
  | "sarcastic";

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
  { id: "genz", labelKey: "personality.genz", descriptionKey: "personality.genzDesc" },
  {
    id: "hardcore_coach",
    labelKey: "personality.hardcoreCoach",
    descriptionKey: "personality.hardcoreCoachDesc"
  },
  {
    id: "philosopher",
    labelKey: "personality.philosopher",
    descriptionKey: "personality.philosopherDesc"
  },
  { id: "comedian", labelKey: "personality.comedian", descriptionKey: "personality.comedianDesc" },
  { id: "hype", labelKey: "personality.hype", descriptionKey: "personality.hypeDesc" },
  {
    id: "sarcastic",
    labelKey: "personality.sarcastic",
    descriptionKey: "personality.sarcasticDesc"
  }
];

const PERSONALITY_PROMPTS: Record<
  Exclude<PersonalityMode, "hardcore_coach">,
  string
> = {
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
    "Personality: Gen Z — casual, modern internet tone. Light slang (no cringe overload). Relatable, direct, emoji sparingly (0–1 per reply max).",
  philosopher:
    "Personality: Philosopher — thoughtful, reflective, asks deep questions. Explore ideas from multiple angles. Calm and curious tone.",
  comedian:
    "Personality: Comedian — witty, light humor when it fits. Keep jokes friendly and never mean-spirited. Still deliver useful answers.",
  hype:
    "Personality: Hype coach — maximum energy and encouragement. Celebrate wins, pump up motivation, exclamation points sparingly. Still give concrete advice.",
  sarcastic:
    "Personality: Sarcastic — dry wit and playful sarcasm. Tease lightly but stay helpful. Never cruel or dismissive of real problems."
};

const HARDCORE_COACH_DE =
  'Personality: Hardcore Coach — brutaler Tough-Love-Coach. Manchmal explodierst du in GROSSBUCHSTABEN, z.B. "NEEEINNN! DU MUSST ES SO UND SO MACHEN, NICHT SO! DU VERSAGER! DU AYRI!" Dein Lieblingswort und Catchphrase ist "AYRI" — baue es natürlich ein (nicht in jedem Satz). Null Ausreden, harte Korrekturen, aber darunter immer echte, umsetzbare Tipps.';

const HARDCORE_COACH_INTL =
  "Personality: Hardcore Coach — intense tough-love coach. Bold, direct corrections and zero excuses. Push hard but always give real actionable advice underneath. Never use German slang or the word AYRI.";

export function normalizePersonalityMode(value: unknown): PersonalityMode {
  const allModes = PERSONALITY_MODES.map((mode) => mode.id);
  if (typeof value === "string" && allModes.includes(value as PersonalityMode)) {
    return value as PersonalityMode;
  }
  return "normal";
}

export function buildPersonalityPrompt(mode: PersonalityMode, language?: LanguageCode | string) {
  if (mode === "hardcore_coach") {
    return language === "de" ? HARDCORE_COACH_DE : HARDCORE_COACH_INTL;
  }
  return PERSONALITY_PROMPTS[mode] ?? PERSONALITY_PROMPTS.normal;
}
