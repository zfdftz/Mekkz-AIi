import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";
import { fetchOwnProfile } from "@/lib/community/own-profile";
import { getProfile } from "@/lib/community/profile";
import { listFriends } from "@/lib/community/social";

export const ASSISTANT_CHAT_LABEL = "mekkz";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripUserChatPrefix(content: string, username: string) {
  const trimmed = content.trim();
  const pattern = new RegExp(`^${escapeRegExp(username)}\\(user\\):\\s*`, "i");
  return trimmed.replace(pattern, "").trim();
}

export function stripAssistantChatPrefix(content: string) {
  return content.trim().replace(/^mekkz\(ai\):\s*/i, "").trim();
}

export function formatUserChatLine(username: string, content: string) {
  const body = stripUserChatPrefix(content, username);
  if (!body) return `${username}(user):`;
  return `${username}(user): ${body}`;
}

export function formatAssistantChatLine(content: string) {
  const body = stripAssistantChatPrefix(content);
  if (!body) return `${ASSISTANT_CHAT_LABEL}(ai):`;
  return `${ASSISTANT_CHAT_LABEL}(ai): ${body}`;
}

export function displayUserChatContent(username: string, content: string) {
  return formatUserChatLine(username, content);
}

export function displayAssistantChatContent(content: string) {
  return formatAssistantChatLine(content);
}

export function buildChatFormatInstructions(username: string) {
  return (
    `CHAT FORMAT (required):\n` +
    `- The person chatting with you is @${username}. Their lines look like: ${username}(user): message\n` +
    `- Always start every reply with exactly: ${ASSISTANT_CHAT_LABEL}(ai): then your answer.\n` +
    `- One reply only, one language — never duplicate in two languages.\n` +
    `- You know their profile, friends, notes, posts, and message history (below). Use that context naturally when relevant.`
  );
}

function formatFriendDuration(sinceIso: string) {
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return null;
  const days = Math.floor((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "since today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days % 365) / 30);
  if (remMonths === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${remMonths}mo`;
}

function formatFriendSince(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso.slice(0, 10);
  }
}

export function applyChatLineFormat(messages: ChatMessage[], username: string): ChatMessage[] {
  return messages.map((message) => {
    if (message.role === "user") {
      const text = message.content.trim();
      const formatted =
        text && !new RegExp(`^${escapeRegExp(username)}\\(user\\):`, "i").test(text)
          ? formatUserChatLine(username, text)
          : text || formatUserChatLine(username, message.imageName ? `[image: ${message.imageName}]` : "");
      return { ...message, content: formatted };
    }
    if (message.role === "assistant") {
      const text = message.content.trim();
      const formatted =
        text && !/^mekkz\(ai\):/i.test(text) ? formatAssistantChatLine(text) : text;
      return { ...message, content: formatted };
    }
    return message;
  });
}

export async function buildChatUserContextPrompt(
  admin: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<{ username: string; prompt: string }> {
  const profile = await fetchOwnProfile(admin, userId, email);
  const username = profile?.username?.trim() || "user";

  const friends = await listFriends(admin, userId);
  const friendDetails = await Promise.all(
    friends.slice(0, 40).map(async (friend) => {
      const friendProfile = await getProfile(admin, friend.userId);
      return {
        username: friend.username ?? "user",
        bio: friendProfile?.bio?.trim() ?? "",
        postsCount: friendProfile?.postsCount ?? 0,
        xp: friendProfile?.xp ?? 0,
        isOnline: friend.isOnline,
        friendsSince: friend.friendsSince ?? null
      };
    })
  );

  const birthday = profile?.birthday?.trim() || null;

  const lines: string[] = [
    "SIGNED-IN USER PROFILE (internal — do not recite as a list unless asked):",
    `- Profile name: @${username} (their display name / username)`,
    birthday ? `- Birthday: ${birthday}` : "- Birthday: (not set)",
    profile?.bio ? `- Bio: ${profile.bio}` : "- Bio: (empty)",
    profile?.activeTitleLabel ? `- Active title: ${profile.activeTitleLabel}` : null,
    profile?.planLabel ? `- Plan: ${profile.planLabel}` : null,
    profile?.followersCount != null
      ? `- Followers: ${profile.followersCount}, Following: ${profile.followingCount ?? 0}`
      : null,
    profile?.postsCount != null
      ? `- Community: ${profile.postsCount} posts, ${profile.xp ?? 0} XP`
      : null,
    profile?.totalLikes != null ? `- Total likes on posts: ${profile.totalLikes}` : null,
    profile?.isVerified ? "- Verified" : null,
    profile?.isCreator ? "- Mekkz AI Creator" : null,
    profile?.isChosen ? "- The Chosen One" : null,
    profile?.isUltraCreator ? "- Ultra Creator" : null,
    profile?.isFounder ? "- Founder" : null,
    profile?.showcasedBadges?.length
      ? `- Badges: ${profile.showcasedBadges.map((b) => b.name).join(", ")}`
      : null
  ].filter((line): line is string => Boolean(line));

  lines.push("");
  if (friendDetails.length === 0) {
    lines.push("FRIENDS: none added yet.");
  } else {
    lines.push(`FRIENDS (${friendDetails.length} added — you may mention them by @username):`);
    for (const friend of friendDetails) {
      const bits = [`@${friend.username}`];
      if (friend.friendsSince) {
        const duration = formatFriendDuration(friend.friendsSince);
        bits.push(`friends since ${formatFriendSince(friend.friendsSince)}${duration ? ` (${duration})` : ""}`);
      }
      if (friend.isOnline) bits.push("online");
      if (friend.bio) bits.push(friend.bio.slice(0, 160));
      else if (friend.postsCount > 0) bits.push(`${friend.postsCount} posts`);
      lines.push(`- ${bits.join(" · ")}`);
    }
  }

  return { username, prompt: lines.join("\n") };
}
