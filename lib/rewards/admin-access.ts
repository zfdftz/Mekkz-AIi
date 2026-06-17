import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile } from "@/lib/community/profile";
import { isAdminEmail, MEKKZ_REWARDS_ADMIN_USERNAME } from "./constants";

export function isRewardsAdminUsername(username: string | null | undefined) {
  return username?.trim().toLowerCase() === MEKKZ_REWARDS_ADMIN_USERNAME;
}

export async function canManageRewards(
  admin: SupabaseClient,
  userId: string,
  email?: string | null
) {
  if (isAdminEmail(email)) return true;
  const profile = await getProfile(admin, userId);
  return isRewardsAdminUsername(profile?.username);
}
