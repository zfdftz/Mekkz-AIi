import type { SupabaseClient } from "@supabase/supabase-js";
import { usernamesByIds } from "@/lib/community/profile";

const MAX_NOTES = 20;
const MAX_FEED_POSTS = 25;
const MAX_RECENT_MESSAGES = 50;
const MAX_SEARCH_MATCHES = 15;
const MAX_SNIPPET = 140;
const MAX_NOTE_SNIPPET = 160;

const SEARCH_STOP_WORDS = new Set([
  "habe",
  "ich",
  "mal",
  "jemand",
  "jemandem",
  "geschrieben",
  "gesagt",
  "geschickt",
  "text",
  "nachricht",
  "community",
  "did",
  "ever",
  "write",
  "wrote",
  "said",
  "tell",
  "told",
  "someone",
  "anyone",
  "message",
  "messages",
  "post",
  "posts",
  "note",
  "notes",
  "memory",
  "memories",
  "when",
  "what",
  "where",
  "which",
  "that",
  "this",
  "have",
  "has",
  "had",
  "was",
  "were",
  "the",
  "and",
  "for",
  "with",
  "about",
  "from",
  "your",
  "meine",
  "mein",
  "meinem",
  "meinen",
  "deine",
  "dein",
  "einem",
  "einen",
  "einer",
  "eines",
  "schon",
  "noch",
  "nicht",
  "auch",
  "wie",
  "wer",
  "wen",
  "wem",
  "und",
  "oder",
  "aber",
  "doch",
  "denn",
  "weil",
  "wenn",
  "dass",
  "mekkz",
  "user"
]);

type ActivityMessage = {
  at: string;
  channel: "friend" | "group" | "room";
  context: string;
  content: string;
};

function missingTable(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
}

function truncate(text: string, max: number) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function formatActivityDate(iso: string) {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return iso.slice(0, 16);
  }
}

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function extractMessageSearchTerms(text: string): string[] {
  const words = text.toLowerCase().match(/\b[\p{L}\p{N}]{3,}\b/gu) ?? [];
  const unique: string[] = [];
  for (const word of words) {
    if (SEARCH_STOP_WORDS.has(word)) continue;
    if (unique.includes(word)) continue;
    unique.push(word);
    if (unique.length >= 3) break;
  }
  return unique;
}

export function looksLikeMessageLookup(text: string) {
  return /\b(habe ich|did i|geschrieben|geschickt|gesagt|ever write|ever say|ever send|ever post|wrote to|sent to|mal .+ (geschrieben|gesagt))\b/i.test(
    text
  );
}

async function fetchUserNotes(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("notes")
    .select("title, content, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_NOTES);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((n) => ({
    title: n.title as string,
    content: n.content as string,
    updatedAt: n.updated_at as string
  }));
}

async function fetchUserFeedPosts(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("feed_posts")
    .select("content, created_at, post_type, tags")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_FEED_POSTS);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

async function fetchRecentUserMessages(
  admin: SupabaseClient,
  userId: string
): Promise<ActivityMessage[]> {
  const [friendRes, groupRes, roomRes] = await Promise.all([
    admin
      .from("friend_messages")
      .select("content, created_at, receiver_id")
      .eq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("group_chat_messages")
      .select("content, created_at, group_id")
      .eq("user_id", userId)
      .eq("is_ai", false)
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("chat_room_messages")
      .select("content, created_at, room_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15)
  ]);

  const friendRows = friendRes.error && !missingTable(friendRes.error.message) ? [] : friendRes.data ?? [];
  const groupRows = groupRes.error && !missingTable(groupRes.error.message) ? [] : groupRes.data ?? [];
  const roomRows = roomRes.error && !missingTable(roomRes.error.message) ? [] : roomRes.data ?? [];

  const receiverIds = [...new Set(friendRows.map((r) => r.receiver_id as string))];
  const groupIds = [...new Set(groupRows.map((r) => r.group_id as string))];
  const roomIds = [...new Set(roomRows.map((r) => r.room_id as string))];

  const [receiverNames, groupNames, roomNames] = await Promise.all([
    usernamesByIds(admin, receiverIds),
    groupIds.length
      ? admin
          .from("group_chats")
          .select("id, name")
          .in("id", groupIds)
          .then(({ data }) => new Map((data ?? []).map((g) => [g.id as string, g.name as string])))
      : Promise.resolve(new Map<string, string>()),
    roomIds.length
      ? admin
          .from("chat_rooms")
          .select("id, name")
          .in("id", roomIds)
          .then(({ data }) => new Map((data ?? []).map((r) => [r.id as string, r.name as string])))
      : Promise.resolve(new Map<string, string>())
  ]);

  const merged: ActivityMessage[] = [
    ...friendRows.map((row) => ({
      at: row.created_at as string,
      channel: "friend" as const,
      context: `@${receiverNames.get(row.receiver_id as string) ?? "user"}`,
      content: row.content as string
    })),
    ...groupRows.map((row) => ({
      at: row.created_at as string,
      channel: "group" as const,
      context: groupNames.get(row.group_id as string) ?? "group",
      content: row.content as string
    })),
    ...roomRows.map((row) => ({
      at: row.created_at as string,
      channel: "room" as const,
      context: roomNames.get(row.room_id as string) ?? "room",
      content: row.content as string
    }))
  ];

  return merged
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_RECENT_MESSAGES);
}

async function searchUserMessages(
  admin: SupabaseClient,
  userId: string,
  term: string
): Promise<ActivityMessage[]> {
  const pattern = `%${escapeIlike(term)}%`;
  const [friendRes, groupRes, roomRes] = await Promise.all([
    admin
      .from("friend_messages")
      .select("content, created_at, receiver_id")
      .eq("sender_id", userId)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(MAX_SEARCH_MATCHES),
    admin
      .from("group_chat_messages")
      .select("content, created_at, group_id")
      .eq("user_id", userId)
      .eq("is_ai", false)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(MAX_SEARCH_MATCHES),
    admin
      .from("chat_room_messages")
      .select("content, created_at, room_id")
      .eq("user_id", userId)
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(MAX_SEARCH_MATCHES)
  ]);

  const friendRows = friendRes.error && !missingTable(friendRes.error.message) ? [] : friendRes.data ?? [];
  const groupRows = groupRes.error && !missingTable(groupRes.error.message) ? [] : groupRes.data ?? [];
  const roomRows = roomRes.error && !missingTable(roomRes.error.message) ? [] : roomRes.data ?? [];

  const receiverIds = [...new Set(friendRows.map((r) => r.receiver_id as string))];
  const groupIds = [...new Set(groupRows.map((r) => r.group_id as string))];
  const roomIds = [...new Set(roomRows.map((r) => r.room_id as string))];

  const [receiverNames, groupNames, roomNames] = await Promise.all([
    usernamesByIds(admin, receiverIds),
    groupIds.length
      ? admin
          .from("group_chats")
          .select("id, name")
          .in("id", groupIds)
          .then(({ data }) => new Map((data ?? []).map((g) => [g.id as string, g.name as string])))
      : Promise.resolve(new Map<string, string>()),
    roomIds.length
      ? admin
          .from("chat_rooms")
          .select("id, name")
          .in("id", roomIds)
          .then(({ data }) => new Map((data ?? []).map((r) => [r.id as string, r.name as string])))
      : Promise.resolve(new Map<string, string>())
  ]);

  const merged: ActivityMessage[] = [
    ...friendRows.map((row) => ({
      at: row.created_at as string,
      channel: "friend" as const,
      context: `@${receiverNames.get(row.receiver_id as string) ?? "user"}`,
      content: row.content as string
    })),
    ...groupRows.map((row) => ({
      at: row.created_at as string,
      channel: "group" as const,
      context: groupNames.get(row.group_id as string) ?? "group",
      content: row.content as string
    })),
    ...roomRows.map((row) => ({
      at: row.created_at as string,
      channel: "room" as const,
      context: roomNames.get(row.room_id as string) ?? "room",
      content: row.content as string
    }))
  ];

  const seen = new Set<string>();
  return merged
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .filter((row) => {
      const key = `${row.at}:${row.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SEARCH_MATCHES);
}

function formatMessageLine(row: ActivityMessage) {
  const channelLabel =
    row.channel === "friend" ? "DM" : row.channel === "group" ? "group" : "room";
  return `- [${formatActivityDate(row.at)} · ${channelLabel} · ${row.context}] ${truncate(row.content, MAX_SNIPPET)}`;
}

export async function buildExtendedUserActivityContext(
  admin: SupabaseClient,
  userId: string,
  options?: { searchHint?: string }
): Promise<string> {
  const searchHint = options?.searchHint?.trim() ?? "";
  const searchTerms =
    searchHint && looksLikeMessageLookup(searchHint)
      ? extractMessageSearchTerms(searchHint)
      : [];

  const [notes, feedPosts, recentMessages, searchMatches] = await Promise.all([
    fetchUserNotes(admin, userId).catch(() => []),
    fetchUserFeedPosts(admin, userId).catch(() => []),
    fetchRecentUserMessages(admin, userId).catch(() => []),
    searchTerms.length > 0
      ? Promise.all(searchTerms.map((term) => searchUserMessages(admin, userId, term))).then(
          (results) => {
            const seen = new Set<string>();
            return results
              .flat()
              .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
              .filter((row) => {
                const key = `${row.at}:${row.content}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .slice(0, MAX_SEARCH_MATCHES);
          }
        )
      : Promise.resolve([] as ActivityMessage[])
  ]);

  const lines: string[] = [
    "USER ACTIVITY LOG (internal — use to answer questions about their notes, posts, messages, and community history; do not dump unprompted):",
    "- Saved memories: see Long-term memory section above (includes save dates).",
    "- For 'did I ever write/say X' questions: check MESSAGE SEARCH and RECENT MESSAGES below first; say clearly if nothing matches."
  ];

  lines.push("");
  if (notes.length === 0) {
    lines.push("NOTES: none saved.");
  } else {
    lines.push(`NOTES (${notes.length} most recent):`);
    for (const note of notes) {
      const snippet = truncate(note.content || note.title, MAX_NOTE_SNIPPET);
      lines.push(
        `- [${formatActivityDate(note.updatedAt)}] ${note.title.trim() || "Untitled"}: ${snippet}`
      );
    }
  }

  lines.push("");
  if (feedPosts.length === 0) {
    lines.push("COMMUNITY POSTS: none published.");
  } else {
    lines.push(`COMMUNITY POSTS (${feedPosts.length} recent):`);
    for (const post of feedPosts) {
      const tags = Array.isArray(post.tags) && post.tags.length ? ` #${post.tags.join(" #")}` : "";
      lines.push(
        `- [${formatActivityDate(post.created_at as string)} · ${post.post_type}]${tags} ${truncate(post.content as string, MAX_SNIPPET)}`
      );
    }
  }

  lines.push("");
  if (recentMessages.length === 0) {
    lines.push("RECENT MESSAGES (by user): none in friend/group/room chats.");
  } else {
    lines.push(`RECENT MESSAGES (last ${recentMessages.length} sent by user):`);
    for (const row of recentMessages) {
      lines.push(formatMessageLine(row));
    }
  }

  if (searchTerms.length > 0) {
    lines.push("");
    if (searchMatches.length === 0) {
      lines.push(`MESSAGE SEARCH (terms: ${searchTerms.join(", ")}): no matches found.`);
    } else {
      lines.push(`MESSAGE SEARCH (terms: ${searchTerms.join(", ")} — ${searchMatches.length} matches):`);
      for (const row of searchMatches) {
        lines.push(formatMessageLine(row));
      }
    }
  }

  return lines.join("\n");
}
