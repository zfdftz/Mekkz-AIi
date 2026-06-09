import { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  LANGUAGE_STORAGE_KEY,
  type LanguageCode,
  detectLanguageFromRequest,
  isSupportedLanguage,
  normalizeLanguage
} from "./languages";

export type UserLanguagePreference = {
  language: LanguageCode;
  autoDetected: boolean;
};

function isMissingTableError(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
}

export async function getUserLanguagePreference(
  admin: SupabaseClient,
  userId: string
): Promise<UserLanguagePreference | null> {
  const { data, error } = await admin
    .from("user_preferences")
    .select("preferred_language, language_auto_detected")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) return null;
    throw new Error(error.message);
  }

  if (!data?.preferred_language) return null;

  return {
    language: normalizeLanguage(data.preferred_language),
    autoDetected: Boolean(data.language_auto_detected)
  };
}

export async function setUserLanguagePreference(
  admin: SupabaseClient,
  userId: string,
  language: LanguageCode,
  autoDetected = false
) {
  const payload = {
    user_id: userId,
    preferred_language: language,
    language_auto_detected: autoDetected,
    updated_at: new Date().toISOString()
  };

  const { error } = await admin.from("user_preferences").upsert(payload);

  if (error && isMissingTableError(error.message)) {
    return null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return payload;
}

export function languageFromCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  const decoded = decodeURIComponent(match[1]);
  return isSupportedLanguage(decoded) ? decoded : normalizeLanguage(decoded);
}

export async function resolveUserLanguage(
  admin: SupabaseClient,
  userId: string | null | undefined,
  req: Request,
  requestedLanguage?: string | null
): Promise<LanguageCode> {
  if (requestedLanguage && isSupportedLanguage(normalizeLanguage(requestedLanguage))) {
    return normalizeLanguage(requestedLanguage);
  }

  if (userId) {
    const saved = await getUserLanguagePreference(admin, userId);
    if (saved?.language) return saved.language;
  }

  const cookieLanguage = languageFromCookieHeader(req.headers.get("cookie"));
  if (cookieLanguage) return cookieLanguage;

  return detectLanguageFromRequest(req);
}

export function buildLanguageCookie(language: LanguageCode) {
  const maxAge = 60 * 60 * 24 * 365;
  return `${LANGUAGE_COOKIE}=${encodeURIComponent(language)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export { LANGUAGE_COOKIE, LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE };
