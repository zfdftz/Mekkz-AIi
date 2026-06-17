import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile, touchPresence } from "@/lib/community/profile";
import { getFollowerCounts, getTotalLikes } from "@/lib/community/public-profile";
import type { UserProfile } from "@/lib/community/types";
import { getPlanInfo } from "@/lib/plans";
import { canManageRewards } from "@/lib/rewards/admin-access";
import { getProfileCosmetics } from "@/lib/rewards/cosmetics";
import { getAuthorIdentity } from "@/lib/rewards/identity";
import { resolveEntitledPlan } from "@/lib/user-plans";

export async function fetchOwnProfile(
  admin: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<UserProfile | null> {
  void touchPresence(admin, userId, true);

  const [profile, counts, identity, isRewardsAdmin, totalLikes, cosmetics, planResult] =
    await Promise.all([
      getProfile(admin, userId),
      getFollowerCounts(admin, userId),
      getAuthorIdentity(admin, userId),
      canManageRewards(admin, userId, email),
      getTotalLikes(admin, userId),
      getProfileCosmetics(admin, userId),
      admin
        .from("user_plans")
        .select("plan, stripe_subscription_status")
        .eq("user_id", userId)
        .maybeSingle()
    ]);

  if (!profile) return null;

  const plan = resolveEntitledPlan(planResult.data as Parameters<typeof resolveEntitledPlan>[0]);
  const planInfo = getPlanInfo(plan);

  return {
    ...profile,
    ...counts,
    isRewardsAdmin,
    isVerified: identity.isVerified,
    isCreator: identity.isCreator,
    isChosen: identity.isChosen,
    isUltraCreator: identity.isUltraCreator,
    isFounder: identity.isFounder,
    activeTitleLabel: identity.titleLabel,
    accentColor: cosmetics.accentColor,
    profileBackground: cosmetics.profileBackground,
    profileFrame: cosmetics.profileFrame,
    activeTitle: cosmetics.activeTitle,
    totalLikes,
    plan,
    planLabel: planInfo.label,
    showcasedBadges: identity.showcasedBadges.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon
    }))
  };
}
