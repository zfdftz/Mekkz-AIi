import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "./types";

function isMissingTable(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
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

export async function getProfile(
  admin: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await admin
    .from("user_profiles")
    .select(
      "user_id, username, bio, avatar_url, messages_sent, posts_count, xp, updated_at"
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

  return {
    userId: data.user_id,
    username: data.username,
    bio: data.bio ?? "",
    avatarUrl: data.avatar_url,
    messagesSent: data.messages_sent ?? 0,
    postsCount: data.posts_count ?? 0,
    xp: data.xp ?? 0,
    isOnline: presence?.is_online ?? false,
    lastSeenAt: presence?.last_seen_at ?? null
  };
}

export async function updateProfile(
  admin: SupabaseClient,
  userId: string,
  patch: { username?: string; bio?: string; avatarUrl?: string | null }
) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString()
  };
  if (patch.username != null) payload.username = patch.username.trim().slice(0, 32);
  if (patch.bio != null) payload.bio = patch.bio.slice(0, 500);
  if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;

  const { error } = await admin.from("user_profiles").upsert(payload);
  if (error) throw new Error(error.message);
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
