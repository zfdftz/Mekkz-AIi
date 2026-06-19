import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAIResponse } from "@/lib/ai";
import type { LanguageCode } from "@/lib/languages";
import type {
  ChatRoom,
  FeedComment,
  FeedPost,
  FriendMessage,
  FriendRequest,
  FriendRequestResult,
  GroupChat,
  GroupMessage,
  RoomMessage
} from "./types";
import { enrichWithAuthorFields } from "@/lib/rewards/identity";
import { getProfile, authorMetaByIds, usernamesByIds } from "./profile";
import { normalizeUsername, validateUsername } from "./profile-rules";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export const PUBLIC_ROOM_MESSAGE_COOLDOWN_MS = 7000;

export class RoomMessageCooldownError extends Error {
  readonly code = "ROOM_MESSAGE_COOLDOWN" as const;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("ROOM_MESSAGE_COOLDOWN");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function roomMessageCooldownText(language: LanguageCode, seconds: number) {
  if (language === "de") {
    return `Bitte ${seconds} Sekunde${seconds === 1 ? "" : "n"} warten, bevor du erneut schreibst.`;
  }
  return `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before sending again.`;
}

export async function getRoomMessageCooldownSeconds(
  admin: SupabaseClient,
  userId: string,
  roomId: string
): Promise<number> {
  const { data, error } = await admin
    .from("chat_room_messages")
    .select("created_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (missing(error.message)) return 0;
    throw new Error(error.message);
  }
  if (!data?.created_at) return 0;

  const elapsed = Date.now() - new Date(data.created_at).getTime();
  const remaining = PUBLIC_ROOM_MESSAGE_COOLDOWN_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

async function assertRoomMessageCooldown(
  admin: SupabaseClient,
  userId: string,
  roomId: string
) {
  const retryAfterSeconds = await getRoomMessageCooldownSeconds(admin, userId, roomId);
  if (retryAfterSeconds > 0) {
    throw new RoomMessageCooldownError(retryAfterSeconds);
  }
}

export async function listRooms(admin: SupabaseClient, search?: string): Promise<ChatRoom[]> {
  let query = admin.from("chat_rooms").select("*").order("name");
  if (search?.trim()) query = query.ilike("name", `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapRoom);
}

export async function joinRoom(admin: SupabaseClient, userId: string, roomId: string) {
  const { error } = await admin.from("chat_room_members").upsert({ room_id: roomId, user_id: userId });
  if (error) throw new Error(error.message);
}

export async function leaveRoom(admin: SupabaseClient, userId: string, roomId: string) {
  await admin.from("chat_room_members").delete().eq("room_id", roomId).eq("user_id", userId);
}

export async function listRoomMessages(
  admin: SupabaseClient,
  roomId: string,
  limit = 80
): Promise<RoomMessage[]> {
  const { data, error } = await admin
    .from("chat_room_messages")
    .select("id, room_id, user_id, content, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const { names, avatars } = await authorMetaByIds(admin, userIds);
  const base = (data ?? []).map((row) => ({
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    authorName: names.get(row.user_id) ?? null,
    authorAvatarUrl: avatars.get(row.user_id) ?? null
  }));
  return enrichWithAuthorFields(admin, base);
}

export async function postRoomMessage(
  admin: SupabaseClient,
  userId: string,
  roomId: string,
  content: string
) {
  await assertRoomMessageCooldown(admin, userId, roomId);

  const { data, error } = await admin
    .from("chat_room_messages")
    .insert({ room_id: roomId, user_id: userId, content })
    .select("id, room_id, user_id, content, created_at")
    .single();
  if (error) throw new Error(error.message);
  const { names, avatars } = await authorMetaByIds(admin, [userId]);
  const [message] = await enrichWithAuthorFields(admin, [
    {
      id: data.id,
      roomId: data.room_id,
      userId: data.user_id,
      content: data.content,
      createdAt: data.created_at,
      authorName: names.get(userId) ?? null,
      authorAvatarUrl: avatars.get(userId) ?? null
    }
  ]);
  return message;
}

export async function listFriendRequests(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) {
    if (missing(error.message)) return [] as FriendRequest[];
    throw new Error(error.message);
  }
  const ids = [...new Set((data ?? []).flatMap((r) => [r.from_user_id, r.to_user_id]))];
  const names = await usernamesByIds(admin, ids);
  return (data ?? []).map((row) => ({
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
    fromUsername: names.get(row.from_user_id) ?? null,
    toUsername: names.get(row.to_user_id) ?? null,
    direction:
      row.to_user_id === userId ? ("incoming" as const) : ("outgoing" as const)
  })) as FriendRequest[];
}

export async function listIncomingFriendRequests(
  admin: SupabaseClient,
  userId: string
): Promise<FriendRequest[]> {
  const pending = (await listFriendRequests(admin, userId)).filter(
    (r) => r.status === "pending" && r.toUserId === userId
  );
  const enriched: FriendRequest[] = [];
  for (const req of pending) {
    const profile = await getProfile(admin, req.fromUserId);
    enriched.push({
      ...req,
      direction: "incoming",
      profile: profile
        ? {
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            isOnline: profile.isOnline,
            postsCount: profile.postsCount,
            xp: profile.xp
          }
        : undefined
    });
  }
  return enriched;
}

export async function sendFriendRequest(
  admin: SupabaseClient,
  fromUserId: string,
  toUsername: string
): Promise<FriendRequestResult> {
  const normalized = normalizeUsername(toUsername);
  validateUsername(normalized);

  const { data: target } = await admin
    .from("user_profiles")
    .select("user_id, username")
    .ilike("username", normalized)
    .maybeSingle();
  if (!target?.user_id) {
    throw new Error("USER_NOT_FOUND");
  }
  return sendFriendRequestToUser(admin, fromUserId, target);
}

export async function sendFriendRequestByUserId(
  admin: SupabaseClient,
  fromUserId: string,
  toUserId: string
): Promise<FriendRequestResult> {
  const { data: target } = await admin
    .from("user_profiles")
    .select("user_id, username")
    .eq("user_id", toUserId)
    .maybeSingle();
  if (!target?.user_id) {
    throw new Error("USER_NOT_FOUND");
  }
  return sendFriendRequestToUser(admin, fromUserId, target);
}

export type FriendshipStatus = "none" | "friends" | "pending_outgoing" | "pending_incoming";

export async function getFriendshipStatus(
  admin: SupabaseClient,
  userId: string,
  otherUserId: string
): Promise<{ status: FriendshipStatus; requestId?: string }> {
  if (userId === otherUserId) return { status: "none" };

  const { data: existingFriend } = await admin
    .from("friendships")
    .select("friend_id")
    .eq("user_id", userId)
    .eq("friend_id", otherUserId)
    .maybeSingle();
  if (existingFriend) return { status: "friends" };

  const { data: incoming } = await admin
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", otherUserId)
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (incoming) return { status: "pending_incoming", requestId: incoming.id as string };

  const { data: outgoing } = await admin
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", userId)
    .eq("to_user_id", otherUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (outgoing) return { status: "pending_outgoing", requestId: outgoing.id as string };

  return { status: "none" };
}

async function sendFriendRequestToUser(
  admin: SupabaseClient,
  fromUserId: string,
  target: { user_id: string; username: string | null }
): Promise<FriendRequestResult> {
  const targetUsername = target.username ?? undefined;
  if (target.user_id === fromUserId) {
    throw new Error("SELF_ADD");
  }

  const { data: existingFriend } = await admin
    .from("friendships")
    .select("friend_id")
    .eq("user_id", fromUserId)
    .eq("friend_id", target.user_id)
    .maybeSingle();
  if (existingFriend) {
    return {
      status: "already_friends",
      message: "Ihr seid bereits Freunde.",
      friendUserId: target.user_id,
      targetUsername
    };
  }

  const { data: incoming } = await admin
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", target.user_id)
    .eq("to_user_id", fromUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (incoming) {
    await respondFriendRequest(admin, fromUserId, incoming.id, true);
    return {
      status: "mutual_accepted",
      message: "Ihr seid jetzt Freunde!",
      friendUserId: target.user_id,
      targetUsername
    };
  }

  const { data: outgoing } = await admin
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", fromUserId)
    .eq("to_user_id", target.user_id)
    .eq("status", "pending")
    .maybeSingle();
  if (outgoing) {
    return {
      status: "already_pending",
      message: "Freundschaftsanfrage bereits gesendet.",
      targetUsername
    };
  }

  const { error } = await admin.from("friend_requests").upsert({
    from_user_id: fromUserId,
    to_user_id: target.user_id,
    status: "pending"
  });
  if (error) throw new Error(error.message);

  return {
    status: "sent",
    message: "Freundschaftsanfrage gesendet.",
    targetUsername
  };
}

export async function respondFriendRequest(
  admin: SupabaseClient,
  userId: string,
  requestId: string,
  accept: boolean
) {
  const { data: req } = await admin
    .from("friend_requests")
    .select("*")
    .eq("id", requestId)
    .eq("to_user_id", userId)
    .maybeSingle();
  if (!req) throw new Error("Anfrage nicht gefunden.");

  const status = accept ? "accepted" : "declined";
  await admin.from("friend_requests").update({ status }).eq("id", requestId);

  if (accept) {
    await admin.from("friendships").upsert([
      { user_id: req.from_user_id, friend_id: req.to_user_id },
      { user_id: req.to_user_id, friend_id: req.from_user_id }
    ]);
  }
}

export async function listFriends(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("friendships")
    .select("friend_id, created_at")
    .eq("user_id", userId);
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  const ids = (data ?? []).map((r) => r.friend_id as string);
  const friendsSinceMap = new Map(
    (data ?? []).map((r) => [r.friend_id as string, r.created_at as string | null])
  );
  const names = await usernamesByIds(admin, ids);
  const { avatars } = await authorMetaByIds(admin, ids);
  const { data: presence } = await admin.from("user_presence").select("*").in("user_id", ids);
  const presenceMap = new Map((presence ?? []).map((p) => [p.user_id, p]));
  return ids.map((id) => ({
    userId: id,
    username: names.get(id) ?? "user",
    avatarUrl: avatars.get(id) ?? null,
    isOnline: presenceMap.get(id)?.is_online ?? false,
    lastSeenAt: presenceMap.get(id)?.last_seen_at ?? null,
    friendsSince: friendsSinceMap.get(id) ?? null
  }));
}

export async function listFriendMessages(
  admin: SupabaseClient,
  userId: string,
  friendId: string
): Promise<FriendMessage[]> {
  const { data, error } = await admin
    .from("friend_messages")
    .select("id, sender_id, receiver_id, content, created_at")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    )
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  const senderIds = [...new Set((data ?? []).map((r) => r.sender_id))];
  const { names, avatars } = await authorMetaByIds(admin, senderIds);
  const base = (data ?? []).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    createdAt: row.created_at,
    authorName: names.get(row.sender_id) ?? null,
    authorAvatarUrl: avatars.get(row.sender_id) ?? null
  }));
  const enriched = await enrichWithAuthorFields(
    admin,
    base.map((m) => ({ ...m, userId: m.senderId }))
  );
  return enriched.map(({ userId: _uid, ...rest }) => rest as FriendMessage);
}

export async function sendFriendMessage(
  admin: SupabaseClient,
  senderId: string,
  receiverId: string,
  content: string
): Promise<FriendMessage> {
  const { data, error } = await admin
    .from("friend_messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const { names, avatars } = await authorMetaByIds(admin, [senderId]);
  const enriched = await enrichWithAuthorFields(admin, [
    {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      content: data.content,
      createdAt: data.created_at,
      authorName: names.get(senderId) ?? null,
      authorAvatarUrl: avatars.get(senderId) ?? null,
      userId: senderId
    }
  ]);
  const { userId: _uid, ...message } = enriched[0];
  return message as FriendMessage;
}

export async function listGroups(admin: SupabaseClient, userId: string): Promise<GroupChat[]> {
  const { data: memberships } = await admin
    .from("group_chat_members")
    .select("group_id")
    .eq("user_id", userId);
  const ids = (memberships ?? []).map((m) => m.group_id);
  if (ids.length === 0) return [];
  const { data, error } = await admin.from("group_chats").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    createdBy: g.created_by,
    createdAt: g.created_at
  }));
}

export async function createGroup(admin: SupabaseClient, userId: string, name: string) {
  const { data: group, error } = await admin
    .from("group_chats")
    .insert({ name, created_by: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await admin.from("group_chat_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "admin"
  });
  return group as GroupChat;
}

export async function listGroupMessages(admin: SupabaseClient, groupId: string): Promise<GroupMessage[]> {
  const { data, error } = await admin
    .from("group_chat_messages")
    .select("id, group_id, user_id, content, is_ai, thread_parent_id, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  const userIds = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  const { names, avatars } = await authorMetaByIds(admin, userIds);
  const base = (data ?? []).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    content: row.content,
    isAi: row.is_ai,
    threadParentId: row.thread_parent_id,
    createdAt: row.created_at,
    authorName: row.is_ai ? "Mekkz AI" : names.get(row.user_id ?? "") ?? null,
    authorAvatarUrl: row.is_ai ? null : avatars.get(row.user_id ?? "") ?? null
  }));
  const enriched = await enrichWithAuthorFields(
    admin,
    base.filter((m) => m.userId) as (typeof base[0] & { userId: string })[]
  );
  const enrichedMap = new Map(enriched.map((m) => [m.id, m]));
  return base.map((m) => (m.userId && enrichedMap.has(m.id) ? enrichedMap.get(m.id)! : m));
}

export async function postGroupMessage(
  admin: SupabaseClient,
  userId: string,
  groupId: string,
  content: string
): Promise<{ message: GroupMessage; mentionAi: boolean }> {
  const mentionAi = /@mekkz|@ai/i.test(content);
  const { data, error } = await admin
    .from("group_chat_messages")
    .insert({ group_id: groupId, user_id: userId, content })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const message = await mapGroupMessageRow(admin, data);
  return { message, mentionAi };
}

export async function replyGroupAiIfMentioned(
  admin: SupabaseClient,
  groupId: string,
  content: string,
  parentMessageId: string
) {
  const history = await listGroupMessages(admin, groupId);
  const reply = await generateAIResponse([
    {
      role: "system",
      content: "You are Mekkz AI in a group chat. Be concise and helpful."
    },
    ...history.slice(-12).map((m) => ({
      role: (m.isAi ? "assistant" : "user") as "assistant" | "user",
      content: `${m.authorName ?? "User"}: ${m.content}`
    })),
    { role: "user", content }
  ]);
  const { data, error } = await admin
    .from("group_chat_messages")
    .insert({
      group_id: groupId,
      user_id: null,
      content: reply,
      is_ai: true,
      thread_parent_id: parentMessageId
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapGroupMessageRow(admin, data);
}

async function mapGroupMessageRow(
  admin: SupabaseClient,
  row: Record<string, unknown>
): Promise<GroupMessage> {
  if (row.is_ai) {
    return {
      id: row.id as string,
      groupId: row.group_id as string,
      userId: null,
      content: row.content as string,
      isAi: true,
      threadParentId: (row.thread_parent_id as string) ?? null,
      createdAt: row.created_at as string,
      authorName: "Mekkz AI"
    };
  }
  const userId = row.user_id as string;
  const { names, avatars } = await authorMetaByIds(admin, [userId]);
  const enriched = await enrichWithAuthorFields(admin, [
    {
      id: row.id as string,
      groupId: row.group_id as string,
      userId,
      content: row.content as string,
      isAi: false,
      threadParentId: (row.thread_parent_id as string) ?? null,
      createdAt: row.created_at as string,
      authorName: names.get(userId) ?? null,
      authorAvatarUrl: avatars.get(userId) ?? null
    }
  ]);
  const { userId: _uid, ...message } = enriched[0];
  return message as GroupMessage;
}

export async function listFeed(
  admin: SupabaseClient,
  userId: string,
  opts: { cursor?: string; tag?: string; search?: string; trending?: boolean } = {}
): Promise<FeedPost[]> {
  let query = admin
    .from("feed_posts")
    .select("*")
    .order(opts.trending ? "likes_count" : "created_at", { ascending: false })
    .limit(20);
  if (opts.cursor) query = query.lt("created_at", opts.cursor);
  if (opts.tag) query = query.contains("tags", [opts.tag]);
  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/[%_]/g, "");
    if (term) query = query.ilike("content", `%${term}%`);
  }
  const { data, error } = await query;
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  const postIds = (data ?? []).map((p) => p.id);
  const authorIds = [...new Set((data ?? []).map((p) => p.user_id))];
  const names = await usernamesByIds(admin, authorIds);
  const { data: likes } = postIds.length
    ? await admin.from("feed_likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
    : { data: [] };
  const liked = new Set((likes ?? []).map((l) => l.post_id));
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    content: row.content,
    postType: row.post_type,
    tags: row.tags ?? [],
    likesCount: row.likes_count ?? 0,
    commentsCount: row.comments_count ?? 0,
    repostsCount: row.reposts_count ?? 0,
    createdAt: row.created_at,
    authorName: names.get(row.user_id) ?? null,
    likedByMe: liked.has(row.id),
    imageUrl: row.image_url ?? null,
    videoUrl: row.video_url ?? null,
    mediaType: row.media_type ?? "none"
  }));
}

export async function createFeedPost(
  admin: SupabaseClient,
  userId: string,
  content: string,
  postType: FeedPost["postType"],
  tags: string[],
  media?: { imageUrl?: string | null; videoUrl?: string | null; mediaType?: FeedPost["mediaType"] }
) {
  const mediaType = media?.mediaType ?? "none";
  const { data, error } = await admin
    .from("feed_posts")
    .insert({
      user_id: userId,
      content,
      post_type: postType,
      tags,
      image_url: media?.imageUrl ?? null,
      video_url: media?.videoUrl ?? null,
      media_type: mediaType
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const { data: profile } = await admin
    .from("user_profiles")
    .select("posts_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile) {
    await admin
      .from("user_profiles")
      .update({ posts_count: (profile.posts_count ?? 0) + 1 })
      .eq("user_id", userId);
  }
  return data;
}

async function syncFeedPostCounter(
  admin: SupabaseClient,
  postId: string,
  table: "feed_likes" | "feed_comments" | "feed_reposts",
  column: "likes_count" | "comments_count" | "reposts_count"
) {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error) throw new Error(error.message);
  const value = count ?? 0;
  await admin.from("feed_posts").update({ [column]: value }).eq("id", postId);
  return value;
}

export async function toggleLike(admin: SupabaseClient, userId: string, postId: string) {
  const { data: existing } = await admin
    .from("feed_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await admin.from("feed_likes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    const { error } = await admin.from("feed_likes").insert({ post_id: postId, user_id: userId });
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
  }

  const likesCount = await syncFeedPostCounter(admin, postId, "feed_likes", "likes_count");
  const { data: likedRow } = await admin
    .from("feed_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  return { liked: Boolean(likedRow), likesCount };
}

export async function listComments(
  admin: SupabaseClient,
  postId: string,
  viewerUserId?: string
): Promise<FeedComment[]> {
  const { data, error } = await admin
    .from("feed_comments")
    .select("id, post_id, user_id, content, created_at, likes_count")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  const commentIds = (data ?? []).map((r) => r.id as string);
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  const names = await usernamesByIds(admin, ids);
  let liked = new Set<string>();
  if (viewerUserId && commentIds.length) {
    const { data: likes, error: likesError } = await admin
      .from("feed_comment_likes")
      .select("comment_id")
      .eq("user_id", viewerUserId)
      .in("comment_id", commentIds);
    if (!likesError) {
      liked = new Set((likes ?? []).map((row) => row.comment_id as string));
    }
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    authorName: names.get(row.user_id) ?? null,
    likesCount: (row.likes_count as number | undefined) ?? 0,
    likedByMe: liked.has(row.id as string)
  }));
}

export async function addComment(
  admin: SupabaseClient,
  userId: string,
  postId: string,
  content: string
): Promise<{ comment: FeedComment; commentsCount: number }> {
  const { data, error } = await admin
    .from("feed_comments")
    .insert({ post_id: postId, user_id: userId, content })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const commentsCount = await syncFeedPostCounter(admin, postId, "feed_comments", "comments_count");
  const names = await usernamesByIds(admin, [userId]);
  return {
    comment: {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      content: data.content,
      createdAt: data.created_at,
      authorName: names.get(userId) ?? null,
      likesCount: 0,
      likedByMe: false
    },
    commentsCount
  };
}

async function syncCommentLikesCount(admin: SupabaseClient, commentId: string) {
  const { count, error } = await admin
    .from("feed_comment_likes")
    .select("*", { count: "exact", head: true })
    .eq("comment_id", commentId);
  if (error) {
    if (missing(error.message)) return 0;
    throw new Error(error.message);
  }
  const value = count ?? 0;
  const { error: updateError } = await admin
    .from("feed_comments")
    .update({ likes_count: value })
    .eq("id", commentId);
  if (updateError && !missing(updateError.message)) throw new Error(updateError.message);
  return value;
}

export async function toggleCommentLike(
  admin: SupabaseClient,
  userId: string,
  commentId: string
) {
  const { data: existing } = await admin
    .from("feed_comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("feed_comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
  } else {
    const { error } = await admin
      .from("feed_comment_likes")
      .insert({ comment_id: commentId, user_id: userId });
    if (error && !/duplicate|unique/i.test(error.message) && !missing(error.message)) {
      throw new Error(error.message);
    }
  }

  const likesCount = await syncCommentLikesCount(admin, commentId);
  const { data: likedRow } = await admin
    .from("feed_comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  return { liked: Boolean(likedRow), likesCount };
}

export async function repost(admin: SupabaseClient, userId: string, postId: string) {
  const { error } = await admin.from("feed_reposts").insert({ post_id: postId, user_id: userId });
  const alreadyReposted = Boolean(error && /duplicate|unique/i.test(error.message));
  if (error && !alreadyReposted) throw new Error(error.message);

  const repostsCount = await syncFeedPostCounter(admin, postId, "feed_reposts", "reposts_count");
  return { reposted: !alreadyReposted, alreadyReposted, repostsCount };
}

function mapRoom(row: Record<string, unknown>): ChatRoom {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    topic: row.topic as string,
    description: (row.description as string) ?? "",
    rules: (row.rules as string) ?? "",
    pinnedMessageId: (row.pinned_message_id as string) ?? null
  };
}
