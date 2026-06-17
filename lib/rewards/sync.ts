import type { SupabaseClient } from "@supabase/supabase-js";
import { getFollowerCounts } from "@/lib/community/public-profile";
import { getProfile } from "@/lib/community/profile";
import { isOgEligible, MEKKZ_CREATOR_EMAIL, SOCIAL_STAR_THRESHOLD } from "./constants";
import { grantBadge } from "./badges";
import { getCrateState } from "./cosmetics";
import { getCurrentSeasonInfo } from "./seasons";
import { applyCreatorStatus, syncVerification } from "./verification";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export async function syncUserRewards(
  admin: SupabaseClient,
  userId: string,
  email?: string | null,
  registrationDate?: Date | null
) {
  try {
    if (email?.toLowerCase() === MEKKZ_CREATOR_EMAIL) {
      await applyCreatorStatus(admin, userId, email);
    }

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const createdAt =
      registrationDate ?? (authUser?.user?.created_at ? new Date(authUser.user.created_at) : null);

    if (createdAt && isOgEligible(createdAt)) {
      await grantBadge(admin, userId, "og_member", "system");
    }

    const season = getCurrentSeasonInfo();
    if (season.index === 0) {
      await grantBadge(admin, userId, "cosmic_genesis", "system");
    }

    const profile = await getProfile(admin, userId);

    const { count: convCount } = await admin
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((convCount ?? 0) >= 100) {
      await grantBadge(admin, userId, "chats_100", "system");
    }

    const { count: storyCount } = await admin
      .from("feed_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("post_type", "story");
    if ((storyCount ?? 0) >= 1) {
      await grantBadge(admin, userId, "first_story", "system");
    }

    const { count: commentCount } = await admin
      .from("feed_comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((commentCount ?? 0) >= 10) {
      await grantBadge(admin, userId, "community_helper", "system");
    }

    if (
      process.env.MEKKZ_BETA_EMAILS?.split(",")
        .map((e) => e.trim().toLowerCase())
        .includes(email?.toLowerCase() ?? "")
    ) {
      await grantBadge(admin, userId, "beta_tester", "system");
    }

    if ((profile?.postsCount ?? 0) >= 25) {
      await grantBadge(admin, userId, "feed_legend", "system");
    }

    if ((profile?.messagesSent ?? 0) >= 500) {
      await grantBadge(admin, userId, "chat_warrior", "system");
    }

    if (createdAt && Date.now() - createdAt.getTime() >= 30 * 86400000) {
      await grantBadge(admin, userId, "loyal_member", "system");
    }

    const { count: groupCount } = await admin
      .from("group_chats")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId);
    if ((groupCount ?? 0) >= 1) {
      await grantBadge(admin, userId, "group_pioneer", "system");
    }

    const { data: topPost } = await admin
      .from("feed_posts")
      .select("likes_count")
      .eq("user_id", userId)
      .order("likes_count", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((topPost?.likes_count as number) >= 50) {
      await grantBadge(admin, userId, "trend_setter", "system");
    }

    const crate = await getCrateState(admin, userId);
    if (crate.totalOpens >= 10) {
      await grantBadge(admin, userId, "crate_hunter", "system");
    }

    const counts = await getFollowerCounts(admin, userId);
    if (counts.followersCount >= SOCIAL_STAR_THRESHOLD) {
      await grantBadge(admin, userId, "social_star", "system");
    }

    await syncVerification(admin, userId, counts.followersCount);
  } catch (err) {
    if (err instanceof Error && !missing(err.message)) {
      console.warn("[rewards] sync failed:", err.message);
    }
  }
}
