import { normalizePersonalityMode } from "./personality";
import type { UserAiPreferences } from "./user-ai-preferences";

const STORAGE_PREFIX = "mekkz_ai_prefs_";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readCachedAiPreferences(userId: string): UserAiPreferences | null {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<UserAiPreferences>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      personalityMode: normalizePersonalityMode(parsed.personalityMode),
      tutorModeEnabled: Boolean(parsed.tutorModeEnabled),
      tutorLevel:
        parsed.tutorLevel === "beginner" ||
        parsed.tutorLevel === "advanced" ||
        parsed.tutorLevel === "intermediate"
          ? parsed.tutorLevel
          : "intermediate",
      voiceOutputEnabled: Boolean(parsed.voiceOutputEnabled),
      voiceAutoSend: parsed.voiceAutoSend !== false,
      voiceGender: parsed.voiceGender === "male" ? "male" : "female",
      customInstructions:
        typeof parsed.customInstructions === "string" ? parsed.customInstructions : ""
    };
  } catch {
    return null;
  }
}

export function writeCachedAiPreferences(userId: string, preferences: UserAiPreferences) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(preferences));
  } catch {
    // Storage full or blocked — ignore.
  }
}

export function patchCachedAiPreferences(
  userId: string,
  patch: Partial<UserAiPreferences>,
  fallback: UserAiPreferences
) {
  const merged: UserAiPreferences = {
    ...fallback,
    ...readCachedAiPreferences(userId),
    ...patch,
    ...(patch.personalityMode
      ? { personalityMode: normalizePersonalityMode(patch.personalityMode) }
      : {})
  };
  writeCachedAiPreferences(userId, merged);
  return merged;
}
