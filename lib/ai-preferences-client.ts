import { normalizePersonalityMode } from "./personality";
import type { UserAiPreferences } from "./user-ai-preferences";

const STORAGE_PREFIX = "mekkz_ai_prefs_";

export type CachedAiPreferences = UserAiPreferences & {
  cachedAt?: string;
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function normalizeCachedPreferences(parsed: Partial<CachedAiPreferences>): CachedAiPreferences {
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
      typeof parsed.customInstructions === "string" ? parsed.customInstructions : "",
    cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : undefined
  };
}

export function stripCacheMeta(preferences: CachedAiPreferences): UserAiPreferences {
  const { cachedAt: _cachedAt, ...rest } = preferences;
  return rest;
}

export function readCachedAiPreferences(userId: string): CachedAiPreferences | null {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedAiPreferences>;
    if (!parsed || typeof parsed !== "object") return null;

    return normalizeCachedPreferences(parsed);
  } catch {
    return null;
  }
}

export function writeCachedAiPreferences(
  userId: string,
  preferences: UserAiPreferences,
  cachedAt?: string
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload: CachedAiPreferences = {
      ...preferences,
      cachedAt: cachedAt ?? new Date().toISOString()
    };
    window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
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
