import type { SupabaseClient } from "@supabase/supabase-js";
import { listNotes, listTasks } from "@/lib/community/productivity";
import type { HubSearchResult } from "./types";
import { searchFiles } from "./files";
import { searchProjects } from "./workspaces";

function missing(msg: string) {
  return msg.includes("does not exist") || msg.includes("relation");
}

export async function globalSearch(
  admin: SupabaseClient,
  userId: string,
  query: string
): Promise<HubSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const results: HubSearchResult[] = [];

  const [conversations, files, notes, tasks, projects, posts] = await Promise.all([
    searchConversations(admin, userId, q),
    searchFiles(admin, userId, q),
    searchNotesSafe(admin, userId, q),
    searchTasksSafe(admin, userId, q),
    searchProjects(admin, userId, q),
    searchFeedPosts(admin, userId, q)
  ]);

  results.push(
    ...conversations,
    ...files.map((f) => ({
      kind: "file" as const,
      id: f.id,
      title: f.name,
      snippet: f.mimeType,
      href: "/hub?panel=files"
    })),
    ...notes,
    ...tasks,
    ...projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      title: p.name,
      snippet: p.description.slice(0, 120) || p.status,
      href: "/hub?panel=projects"
    })),
    ...posts
  );
  return results.slice(0, 40);
}

async function searchConversations(admin: SupabaseClient, userId: string, q: string) {
  const { data, error } = await admin
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .ilike("title", `%${q}%`)
    .limit(8);
  if (error) {
    if (missing(error.message)) return [];
    return [];
  }
  return (data ?? []).map(
    (row): HubSearchResult => ({
      kind: "chat",
      id: row.id as string,
      title: (row.title as string) || "Chat",
      snippet: "Gespeicherter Chat",
      href: `/hub?chat=${row.id}`
    })
  );
}

async function searchNotesSafe(admin: SupabaseClient, userId: string, q: string) {
  try {
    const notes = await listNotes(admin, userId, q);
    return notes.slice(0, 8).map(
      (n): HubSearchResult => ({
        kind: "note",
        id: n.id,
        title: n.title,
        snippet: n.content.slice(0, 120),
        href: "/hub?panel=notes"
      })
    );
  } catch {
    return [];
  }
}

async function searchTasksSafe(admin: SupabaseClient, userId: string, q: string) {
  try {
    const tasks = await listTasks(admin, userId);
    const needle = q.toLowerCase();
    return tasks
      .filter((t) => t.title.toLowerCase().includes(needle))
      .slice(0, 8)
      .map(
        (t): HubSearchResult => ({
          kind: "task",
          id: t.id,
          title: t.title,
          snippet: t.status,
          href: "/hub?panel=tasks"
        })
      );
  } catch {
    return [];
  }
}

async function searchFeedPosts(admin: SupabaseClient, userId: string, q: string) {
  const { data, error } = await admin
    .from("feed_posts")
    .select("id, content, created_at")
    .ilike("content", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) {
    if (missing(error.message)) return [];
    return [];
  }
  return (data ?? []).map(
    (row): HubSearchResult => ({
      kind: "post",
      id: row.id as string,
      title: "Community Post",
      snippet: (row.content as string).slice(0, 120),
      href: "/hub?panel=feed"
    })
  );
}