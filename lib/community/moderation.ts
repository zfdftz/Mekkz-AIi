import type { SupabaseClient } from "@supabase/supabase-js";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export async function sendUserWarning(admin: SupabaseClient, userId: string, message: string) {
  const { error } = await admin
    .from("user_profiles")
    .update({ moderation_warning: message.trim().slice(0, 500) })
    .eq("user_id", userId);
  if (error && !missing(error.message)) throw new Error(error.message);
}

export async function banUser(admin: SupabaseClient, userId: string, days: number) {
  const until = new Date();
  until.setDate(until.getDate() + Math.max(1, Math.min(days, 365)));
  const { error } = await admin
    .from("user_profiles")
    .update({ banned_until: until.toISOString() })
    .eq("user_id", userId);
  if (error && !missing(error.message)) throw new Error(error.message);
  return until;
}

export async function unbanUser(admin: SupabaseClient, userId: string) {
  const { error } = await admin
    .from("user_profiles")
    .update({ banned_until: null, moderation_warning: null })
    .eq("user_id", userId);
  if (error && !missing(error.message)) throw new Error(error.message);
}

export async function deleteUserAccount(admin: SupabaseClient, userId: string) {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}
