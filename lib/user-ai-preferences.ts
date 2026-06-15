import { SupabaseClient } from "@supabase/supabase-js";
import { normalizePersonalityMode, type PersonalityMode } from "./personality";
import { normalizeTutorLevel, type TutorLevel } from "./tutor";

export type UserAiPreferences = {
  personalityMode: PersonalityMode;
  tutorModeEnabled: boolean;
  tutorLevel: TutorLevel;
  voiceOutputEnabled: boolean;
  voiceAutoSend: boolean;
};

const DEFAULT_PREFERENCES: UserAiPreferences = {
  personalityMode: "normal",
  tutorModeEnabled: false,
  tutorLevel: "intermediate",
  voiceOutputEnabled: false,
  voiceAutoSend: true
};

function isMissingTableError(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
}

function mapRow(row: Record<string, unknown> | null): UserAiPreferences {
  if (!row) return { ...DEFAULT_PREFERENCES };
  return {
    personalityMode: normalizePersonalityMode(row.personality_mode),
    tutorModeEnabled: Boolean(row.tutor_mode_enabled),
    tutorLevel: normalizeTutorLevel(row.tutor_level),
    voiceOutputEnabled: Boolean(row.voice_output_enabled),
    voiceAutoSend: row.voice_auto_send !== false
  };
}

export async function getUserAiPreferences(
  admin: SupabaseClient,
  userId: string
): Promise<UserAiPreferences> {
  const { data, error } = await admin
    .from("user_ai_preferences")
    .select(
      "personality_mode, tutor_mode_enabled, tutor_level, voice_output_enabled, voice_auto_send"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) return { ...DEFAULT_PREFERENCES };
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function setUserAiPreferences(
  admin: SupabaseClient,
  userId: string,
  patch: Partial<UserAiPreferences>
) {
  const current = await getUserAiPreferences(admin, userId);
  const next: UserAiPreferences = { ...current, ...patch };

  const payload = {
    user_id: userId,
    personality_mode: next.personalityMode,
    tutor_mode_enabled: next.tutorModeEnabled,
    tutor_level: next.tutorLevel,
    voice_output_enabled: next.voiceOutputEnabled,
    voice_auto_send: next.voiceAutoSend,
    updated_at: new Date().toISOString()
  };

  const { error } = await admin.from("user_ai_preferences").upsert(payload, {
    onConflict: "user_id"
  });

  if (error) {
    if (isMissingTableError(error.message)) return next;
    throw new Error(error.message);
  }

  return next;
}
