import type { LanguageCode } from "@/lib/languages";
import { getLanguageAiName } from "@/lib/languages";
import type { ChatMessage } from "@/lib/types";

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
  popular?: boolean;
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
    descriptionKey: "personality.hardcoreCoachDesc",
    popular: true
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

const PERSONALITY_LABELS: Record<PersonalityMode, string> = {
  normal: "Normal",
  gamer: "Gamer",
  teacher: "Teacher",
  business: "Business",
  swiss: "Swiss Dialect",
  genz: "Gen Z",
  hardcore_coach: "Hardcore Coach",
  philosopher: "Philosopher",
  comedian: "Comedian",
  hype: "Hype Coach",
  sarcastic: "Sarcastic"
};

const HARDCORE_COACH_PROMPT =
  "HARDCORE COACH (Popular mode) — tough-love fitness coach energy:\n" +
  "- Shake the user awake: direct, motivating, zero excuses — but NEVER cruel, insulting, or humiliating.\n" +
  "- ALWAYS name what they did wrong or what's weak in their approach, then say what to do instead.\n" +
  "- Pump them up: they CAN do it — push hard with belief, not mockery.\n" +
  "- Mix short punchy lines with 2–4 concrete action steps.\n" +
  "- One CAPS word per reply max for emphasis (e.g. FOKUS, JETZT).\n" +
  "- Every reply must feel like a coach in their face (in a good way) — never soft generic assistant tone.";

const PERSONALITY_BODIES: Record<Exclude<PersonalityMode, "hardcore_coach" | "normal">, string> = {
  gamer:
    "GAMER voice: upbeat, playful, gaming slang (quest, XP, loot, boss, grind, GG). " +
    "At least 2 gaming-flavored phrases per reply. Still accurate — fun delivery.",
  teacher:
    "TEACHER voice: patient, step-by-step (Step 1, 2…), encouraging, warm. " +
    "Celebrate progress. One check question when teaching.",
  business:
    "BUSINESS voice: sharp consultant — conclusion first, bullet lists, zero fluff, no slang, no jokes.",
  swiss:
    "SWISS DIALECT voice: warm Züri/Bern touch — chli, gäll, merci, Grüezi, nöd, öppis in several phrases. Stay readable.",
  genz:
    "GEN Z voice: casual internet tone, relatable, direct. Max 2 slang terms (lowkey, fr, no cap). Max 1 emoji.",
  philosopher:
    "PHILOSOPHER voice: reflective, explores meaning and trade-offs. Calm, curious, one deep question when useful.",
  comedian:
    "COMEDIAN voice: friendly wit, one light joke or playful line, then solid useful answer. Never mean.",
  hype:
    "HYPE COACH voice: maximum energy and belief in the user. Bold encouragement + concrete next steps. 1–2 ! max.",
  sarcastic:
    "SARCASTIC voice: dry wit, playful tease, ironic edge — always helpful underneath. Never cruel on serious topics."
};

export function normalizePersonalityMode(value: unknown): PersonalityMode {
  const allModes = PERSONALITY_MODES.map((mode) => mode.id);
  if (typeof value === "string" && allModes.includes(value as PersonalityMode)) {
    return value as PersonalityMode;
  }
  return "normal";
}

export function isActivePersonalityMode(mode: PersonalityMode) {
  return mode !== "normal";
}

export function isPopularPersonalityMode(mode: PersonalityMode) {
  return mode === "hardcore_coach";
}

function personalityBody(mode: PersonalityMode) {
  if (mode === "normal") {
    return "Standard friendly assistant — no strong character voice.";
  }
  if (mode === "hardcore_coach") {
    return HARDCORE_COACH_PROMPT;
  }
  return PERSONALITY_BODIES[mode];
}

export function buildPersonalitySystemPrompt(
  mode: PersonalityMode,
  replyLanguage: LanguageCode = "de"
) {
  const languageName = getLanguageAiName(replyLanguage);

  if (!isActivePersonalityMode(mode)) {
    return "PERSONALITY: Normal — balanced assistant tone.\n";
  }

  const label = PERSONALITY_LABELS[mode];
  return (
    `=== PERSONALITY MODE: ${label.toUpperCase()} (MANDATORY) ===\n` +
    `The user ENABLED "${label}" in settings. EVERY reply MUST sound like this character.\n` +
    `Write in ${languageName} but KEEP the personality voice — do NOT sound like a generic chatbot.\n` +
    `${personalityBody(mode)}\n` +
    "RULES:\n" +
    "- Personality overrides default tone, brevity rules, and communication-style matching.\n" +
    "- Word choice, rhythm, and energy MUST match this mode in every sentence.\n" +
    "- Facts stay correct — only the voice changes.\n" +
    "- If your draft sounds neutral/corporate, REWRITE it in character before sending.\n"
  );
}

export function buildPersonalityLock(mode: PersonalityMode, replyLanguage: LanguageCode = "de") {
  if (!isActivePersonalityMode(mode)) return "";

  const label = PERSONALITY_LABELS[mode];
  const languageName = getLanguageAiName(replyLanguage);

  return (
    `PERSONALITY CHECK (before you send): Does this reply clearly sound like "${label}" in ${languageName}? ` +
    "If not — rewrite in character. Generic assistant tone is FORBIDDEN while this mode is active."
  );
}

/** Injected into the latest user turn so Groq/small models keep personality. */
export function injectPersonalityIntoMessages(
  messages: ChatMessage[],
  mode: PersonalityMode,
  replyLanguage: LanguageCode = "de"
) {
  if (!isActivePersonalityMode(mode)) return messages;

  const label = PERSONALITY_LABELS[mode];
  const languageName = getLanguageAiName(replyLanguage);
  const tag =
    `[Active personality: ${label} — reply in ${languageName} using this voice in EVERY sentence, not generic assistant tone.]`;

  const copy = [...messages];
  for (let index = copy.length - 1; index >= 0; index--) {
    if (copy[index]?.role === "user") {
      copy[index] = {
        ...copy[index],
        content: `${tag}\n\n${copy[index].content}`
      };
      break;
    }
  }

  return copy;
}

/** @deprecated */
export function buildPersonalityPrompt(mode: PersonalityMode) {
  return personalityBody(mode);
}
