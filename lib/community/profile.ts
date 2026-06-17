import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeUsername,
  usernameChangeEligibility,
  validateAvatarUrl,
  validateBirthday,
  validateUsername
} from "./profile-rules";
import type { UserProfile } from "./types";

function isMissingTable(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
}

function isDuplicateUsername(message: string) {
  return /duplicate|unique|user_profiles_username/i.test(message);
}

export function isProfileComplete(profile: {
  username?: string | null;
  birthday?: string | null;
}) {
  const username = profile.username?.trim();
  const birthday = profile.birthday?.trim();
  return Boolean(username && birthday);
}

export async function userNeedsOnboarding(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("user_profiles")
    .select("username, birthday")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isMissingTable(error.message)) throw new Error(error.message);
  if (!data) return true;
  return !isProfileComplete(data);
}

export async function hasUserProfile(admin: SupabaseClient, userId: string) {
  return !(await userNeedsOnboarding(admin, userId));
}

export async function ensureUserProfile(admin: SupabaseClient, userId: string, email?: string | null) {
  const { data: existing } = await admin
    .from("user_profiles")
    .select("user_id, username")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const base = (email?.split("@")[0] ?? "user").replace(/[^\w.-]/g, "").slice(0, 20) || "user";
  const username = `${base}-${userId.slice(0, 6)}`;

  const { data, error } = await admin
    .from("user_profiles")
    .upsert({
      user_id: userId,
      username,
      bio: "",
      updated_at: new Date().toISOString()
    })
    .select("user_id, username")
    .maybeSingle();

  if (error && !isMissingTable(error.message)) throw new Error(error.message);
  return data;
}

export async function createProfileFromRegistration(
  admin: SupabaseClient,
  userId: string,
  username: string,
  birthday: string
) {
  return completeProfileFromOnboarding(admin, userId, username, birthday);
}

export async function completeProfileFromOnboarding(
  admin: SupabaseClient,
  userId: string,
  username: string,
  birthday: string
) {
  const normalized = normalizeUsername(username);
  validateUsername(normalized);
  const validatedBirthday = validateBirthday(birthday);

  if (await isUsernameTaken(admin, normalized, userId)) {
    throw new Error("Benutzername ist bereits vergeben.");
  }

  const { data: existing } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    user_id: userId,
    username: normalized,
    birthday: validatedBirthday,
    updated_at: new Date().toISOString()
  };
  if (!existing) payload.bio = "";

  const { error } = await admin.from("user_profiles").upsert(payload);
  if (error && !isMissingTable(error.message)) throw new Error(error.message);
}

export async function getProfile(
  admin: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await admin
    .from("user_profiles")
    .select(
      "user_id, username, bio, avatar_url, birthday, messages_sent, posts_count, xp, updated_at, username_changed_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const { data: presence } = await admin
    .from("user_presence")
    .select("is_online, last_seen_at")
    .eq("user_id", userId)
    .maybeSingle();

  const eligibility = usernameChangeEligibility(data.username_changed_at);

  return {
    userId: data.user_id,
    username: data.username,
    bio: data.bio ?? "",
    avatarUrl: data.avatar_url,
    birthday: (data.birthday as string | null) ?? null,
    messagesSent: data.messages_sent ?? 0,
    postsCount: data.posts_count ?? 0,
    xp: data.xp ?? 0,
    isOnline: presence?.is_online ?? false,
    lastSeenAt: presence?.last_seen_at ?? null,
    usernameChangedAt: data.username_changed_at ?? null,
    canChangeUsername: eligibility.canChange,
    nextUsernameChangeAt: eligibility.nextChangeAt
  };
}

export async function isUsernameTaken(admin: SupabaseClient, username: string, userId: string) {
  const { data, error } = await admin
    .from("user_profiles")
    .select("user_id, username")
    .ilike("username", username)
    .neq("user_id", userId)
    .maybeSingle();

  if (error && !isMissingTable(error.message)) throw new Error(error.message);
  return Boolean(data?.user_id);
}

export async function updateProfile(
  admin: SupabaseClient,
  userId: string,
  patch: { username?: string; bio?: string; avatarUrl?: string | null }
) {
  const { data: current, error: currentError } = await admin
    .from("user_profiles")
    .select("username, username_changed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError && !isMissingTable(currentError.message)) {
    throw new Error(currentError.message);
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  if (patch.username != null) {
    const nextUsername = normalizeUsername(patch.username);
    validateUsername(nextUsername);

    const currentUsername = current?.username ?? "";
    if (nextUsername.toLowerCase() !== (currentUsername ?? "").toLowerCase()) {
      const eligibility = usernameChangeEligibility(current?.username_changed_at);
      if (!eligibility.canChange && eligibility.nextChangeAt) {
        const date = new Date(eligibility.nextChangeAt).toLocaleDateString("de-DE");
        throw new Error(`Benutzername kann erst wieder am ${date} geändert werden (30-Tage-Limit).`);
      }

      if (await isUsernameTaken(admin, nextUsername, userId)) {
        throw new Error("Dieser Benutzername ist bereits vergeben.");
      }

      payload.username = nextUsername;
      payload.username_changed_at = new Date().toISOString();
    }
  }

  if (patch.bio != null) payload.bio = patch.bio.slice(0, 500);

  if (patch.avatarUrl !== undefined) {
    if (patch.avatarUrl === null || patch.avatarUrl === "") {
      payload.avatar_url = null;
    } else {
      validateAvatarUrl(patch.avatarUrl);
      payload.avatar_url = patch.avatarUrl;
    }
  }

  const { error } = await admin.from("user_profiles").upsert(payload);
  if (error) {
    if (isDuplicateUsername(error.message)) {
      throw new Error("Dieser Benutzername ist bereits vergeben.");
    }
    throw new Error(error.message);
  }

  return getProfile(admin, userId);
}

export async function touchPresence(admin: SupabaseClient, userId: string, online = true) {
  await admin.from("user_presence").upsert({
    user_id: userId,
    is_online: online,
    last_seen_at: new Date().toISOString()
  });
}

export async function usernamesByIds(admin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data } = await admin
    .from("user_profiles")
    .select("user_id, username")
    .in("user_id", userIds);
  return new Map((data ?? []).map((row) => [row.user_id as string, row.username as string]));
}
