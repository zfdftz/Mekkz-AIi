import type { SupabaseClient } from "@supabase/supabase-js";
import { getFollowerCounts } from "@/lib/community/public-profile";
import { getProfile } from "@/lib/community/profile";
import { isOgEligible, MEKKZ_CREATOR_EMAIL, SOCIAL_STAR_THRESHOLD } from "./constants";
import { grantBadge } from "./badges";
import { processBirthdayRewards } from "./birthday";
import { getCrateState } from "./cosmetics";
import { addLimitedToInventory } from "./limited-items";
import { getCurrentSeasonInfo } from "./seasons";
import { markRewardsSynced, shouldSyncRewards, trackDailyLogin } from "./sync-throttle";
import { applyCreatorStatus, syncVerification } from "./verification";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

const SEASON_BADGES = [
  "cosmic_genesis",
  "season_2_participant",
  "season_3_participant",
  "season_4_participant",
  "season_5_participant"
] as const;

export async function syncUserRewards(
  admin: SupabaseClient,
  userId: string,
  email?: string | null,
  registrationDate?: Date | null,
  force = false
) {
  try {
    if (!(await shouldSyncRewards(admin, userId, force))) return;

    await trackDailyLogin(admin, userId);

    if (email?.toLowerCase() === MEKKZ_CREATOR_EMAIL) {
      await applyCreatorStatus(admin, userId, email);
      await grantBadge(admin, userId, "founder", "system");
      try {
        await addLimitedToInventory(admin, userId, "lim-crown-creator");
        await addLimitedToInventory(admin, userId, "lim-banner-creator");
      } catch {
        /* already owned */
      }
    }

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const createdAt =
      registrationDate ?? (authUser?.user?.created_at ? new Date(authUser.user.created_at) : null);

    if (createdAt && isOgEligible(createdAt)) {
      await grantBadge(admin, userId, "og_member", "system");
      try {
        await addLimitedToInventory(admin, userId, "lim-frame-og2026");
        await addLimitedToInventory(admin, userId, "lim-banner-og");
      } catch {
        /* owned */
      }
    }

    const season = getCurrentSeasonInfo();
    const seasonBadgeId = SEASON_BADGES[season.index];
    if (seasonBadgeId) {
      await grantBadge(admin, userId, seasonBadgeId, "system");
      if (season.index === 0) {
        try {
          await addLimitedToInventory(admin, userId, "lim-frame-season1");
          await addLimitedToInventory(admin, userId, "lim-crown-s1");
        } catch {
          /* owned */
        }
      }
    }

    const profile = await getProfile(admin, userId);
    const counts = await getFollowerCounts(admin, userId);

    const { count: convCount } = await admin
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const chats = convCount ?? 0;
    if (chats >= 1) await grantBadge(admin, userId, "first_chat", "system");
    if (chats >= 100) await grantBadge(admin, userId, "chats_100", "system");
    if (chats >= 500) await grantBadge(admin, userId, "chats_500", "system");
    if (chats >= 1000) await grantBadge(admin, userId, "chats_1000", "system");
    if (chats >= 5000) await grantBadge(admin, userId, "chats_5000", "system");
    if (chats >= 10000) await grantBadge(admin, userId, "chats_10000", "system");

    const { count: postCount } = await admin
      .from("feed_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((postCount ?? 0) >= 1) {
      await grantBadge(admin, userId, "first_community_post", "system");
      await grantBadge(admin, userId, "secret_first_post", "system");
    }
    if ((postCount ?? 0) >= 25) await grantBadge(admin, userId, "feed_legend", "system");

    const { count: storyCount } = await admin
      .from("feed_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("post_type", "story");
    if ((storyCount ?? 0) >= 1) await grantBadge(admin, userId, "first_story", "system");

    const { count: commentCount } = await admin
      .from("feed_comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((commentCount ?? 0) >= 10) await grantBadge(admin, userId, "community_helper", "system");
    if ((commentCount ?? 0) >= 100) await grantBadge(admin, userId, "top_contributor", "system");

    if (
      process.env.MEKKZ_BETA_EMAILS?.split(",")
        .map((e) => e.trim().toLowerCase())
        .includes(email?.toLowerCase() ?? "")
    ) {
      await grantBadge(admin, userId, "beta_tester", "system");
      try {
        await addLimitedToInventory(admin, userId, "lim-frame-beta");
      } catch {
        /* owned */
      }
    }

    if ((profile?.messagesSent ?? 0) >= 500) await grantBadge(admin, userId, "chat_warrior", "system");

    if (createdAt && Date.now() - createdAt.getTime() >= 30 * 86400000) {
      await grantBadge(admin, userId, "loyal_member", "system");
      await grantBadge(admin, userId, "early_supporter", "system");
    }

    if (createdAt && Date.now() - createdAt.getTime() <= 30 * 86400000) {
      await grantBadge(admin, userId, "secret_first_month", "system");
    }

    const { count: groupCount } = await admin
      .from("group_chats")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId);
    if ((groupCount ?? 0) >= 1) await grantBadge(admin, userId, "group_pioneer", "system");

    const { count: clanCount } = await admin
      .from("clans")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId);
    if ((clanCount ?? 0) >= 1) {
      await grantBadge(admin, userId, "clan_founder", "system");
      await grantBadge(admin, userId, "secret_first_clan", "system");
    }

    const { data: topPost } = await admin
      .from("feed_posts")
      .select("likes_count")
      .eq("user_id", userId)
      .order("likes_count", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((topPost?.likes_count as number) >= 50) await grantBadge(admin, userId, "trend_setter", "system");

    const crate = await getCrateState(admin, userId);
    if (crate.totalOpens >= 10) await grantBadge(admin, userId, "crate_hunter", "system");
    if (crate.totalOpens >= 100) await grantBadge(admin, userId, "secret_100_crates", "system");

    if (counts.followersCount >= SOCIAL_STAR_THRESHOLD) {
      await grantBadge(admin, userId, "social_star", "system");
    }
    if (counts.followersCount >= 10000) await grantBadge(admin, userId, "popular_creator", "system");
    if (counts.followersCount >= 100) {
      await grantBadge(admin, userId, "secret_community_legend", "system");
    }

    const { count: friendCount } = await admin
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    if ((friendCount ?? 0) >= 50) await grantBadge(admin, userId, "friendly_member", "system");
    if ((friendCount ?? 0) >= 100) await grantBadge(admin, userId, "secret_100_friends", "system");

    const { data: streakRow } = await admin
      .from("user_profiles")
      .select("login_streak, tools_used, files_uploaded")
      .eq("user_id", userId)
      .maybeSingle();
    if ((streakRow?.login_streak as number) >= 30) {
      await grantBadge(admin, userId, "secret_30_day_streak", "system");
    }
    if ((streakRow?.files_uploaded as number) >= 100) {
      await grantBadge(admin, userId, "secret_100_files", "system");
    }

    const toolsUsed = (streakRow?.tools_used as string[]) ?? [];
    if (toolsUsed.length >= 5) {
      await grantBadge(admin, userId, "ai_expert", "system");
      await grantBadge(admin, userId, "secret_all_tools", "system");
    }

    const { count: invCount } = await admin
      .from("user_inventory")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((invCount ?? 0) >= 50) await grantBadge(admin, userId, "secret_collector", "system");

    if ((storyCount ?? 0) >= 1 && (postCount ?? 0) >= 1) {
      await grantBadge(admin, userId, "creative_mind", "system");
    }

    await syncVerification(admin, userId, counts.followersCount);
    await processBirthdayRewards(admin, userId);
    await markRewardsSynced(admin, userId);
  } catch (err) {
    if (err instanceof Error && !missing(err.message)) {
      console.warn("[rewards] sync failed:", err.message);
    }
  }
}
