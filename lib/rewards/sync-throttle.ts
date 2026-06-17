import type { SupabaseClient } from "@supabase/supabase-js";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export async function shouldSyncRewards(admin: SupabaseClient, userId: string, force = false) {
  if (force) return true;
  const { data } = await admin
    .from("user_profiles")
    .select("rewards_last_sync_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.rewards_last_sync_at) return true;
  const last = new Date(data.rewards_last_sync_at as string).getTime();
  return Date.now() - last >= SYNC_INTERVAL_MS;
}

export async function markRewardsSynced(admin: SupabaseClient, userId: string) {
  const { error } = await admin
    .from("user_profiles")
    .update({ rewards_last_sync_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error && !missing(error.message)) {
    console.warn("[rewards] sync mark failed:", error.message);
  }
}

export async function trackDailyLogin(admin: SupabaseClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("user_profiles")
    .select("last_login_date, login_streak")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return;
  const last = data.last_login_date as string | null;
  if (last === today) return;

  let streak = (data.login_streak as number) ?? 0;
  if (last) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    streak = last === yStr ? streak + 1 : 1;
  } else {
    streak = 1;
  }

  await admin
    .from("user_profiles")
    .update({ last_login_date: today, login_streak: streak })
    .eq("user_id", userId);
}
