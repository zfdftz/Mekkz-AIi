import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanInfo, type PlanId } from "@/lib/plans";
import { resolveEntitledPlan } from "@/lib/user-plans";
import { getProfile } from "./profile";
import type { FeedPost, PublicUserProfile } from "./types";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

function toDateOnly(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export async function getFollowerCounts(admin: SupabaseClient, userId: string) {
  const [followers, following] = await Promise.all([
    admin.from("user_followers").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    admin.from("user_followers").select("following_id", { count: "exact", head: true }).eq("follower_id", userId)
  ]);
  return {
    followersCount: followers.count ?? 0,
    followingCount: following.count ?? 0
  };
}

export async function isFollowing(admin: SupabaseClient, viewerId: string, targetId: string) {
  const { data } = await admin
    .from("user_followers")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", targetId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleFollow(admin: SupabaseClient, followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error("Du kannst dir nicht selbst folgen.");
  const { data: existing } = await admin
    .from("user_followers")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  if (existing) {
    await admin.from("user_followers").delete().eq("follower_id", followerId).eq("following_id", followingId);
    return { following: false };
  }
  const { error } = await admin.from("user_followers").insert({
    follower_id: followerId,
    following_id: followingId
  });
  if (error) throw new Error(error.message);
  return { following: true };
}

export async function getTopPosts(admin: SupabaseClient, userId: string, limit = 3): Promise<FeedPost[]> {
  const { data, error } = await admin
    .from("feed_posts")
    .select("*")
    .eq("user_id", userId)
    .order("likes_count", { ascending: false })
    .limit(limit);
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapFeedRow(row, false));
}

function mapFeedRow(row: Record<string, unknown>, likedByMe: boolean): FeedPost {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    content: row.content as string,
    postType: row.post_type as FeedPost["postType"],
    tags: (row.tags as string[]) ?? [],
    likesCount: (row.likes_count as number) ?? 0,
    commentsCount: (row.comments_count as number) ?? 0,
    repostsCount: (row.reposts_count as number) ?? 0,
    createdAt: row.created_at as string,
    imageUrl: (row.image_url as string) ?? null,
    videoUrl: (row.video_url as string) ?? null,
    mediaType: (row.media_type as FeedPost["mediaType"]) ?? "none",
    likedByMe
  };
}

export async function getPublicProfile(
  admin: SupabaseClient,
  targetUserId: string,
  viewerId?: string
): Promise<PublicUserProfile | null> {
  const profile = await getProfile(admin, targetUserId);
  if (!profile) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(targetUserId);
  const joinedIso = authUser?.user?.created_at ?? profile.usernameChangedAt;

  const { data: planRow } = await admin
    .from("user_plans")
    .select("plan, stripe_subscription_status, updated_at, plan_started_at")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const plan = resolveEntitledPlan(planRow as Parameters<typeof resolveEntitledPlan>[0]);
  const planInfo = getPlanInfo(plan);
  const planSinceIso =
    plan !== "free"
      ? (planRow?.plan_started_at as string | null) ?? (planRow?.updated_at as string | null)
      : null;

  const counts = await getFollowerCounts(admin, targetUserId);
  const topPosts = await getTopPosts(admin, targetUserId, 3);
  const following =
    viewerId && viewerId !== targetUserId
      ? await isFollowing(admin, viewerId, targetUserId)
      : false;

  return {
    userId: profile.userId,
    username: profile.username,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    postsCount: profile.postsCount,
    messagesSent: profile.messagesSent,
    xp: profile.xp,
    isOnline: profile.isOnline,
    plan,
    planLabel: planInfo.label,
    planSince: toDateOnly(planSinceIso),
    joinedAt: toDateOnly(joinedIso) ?? toDateOnly(new Date().toISOString())!,
    followersCount: counts.followersCount,
    followingCount: counts.followingCount,
    isFollowing: following,
    isSelf: viewerId === targetUserId,
    topPosts
  };
}
