import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubNotification } from "./types";

function missing(msg: string) {
  return msg.includes("does not exist") || msg.includes("relation");
}

function mapNotification(row: Record<string, unknown>): HubNotification {
  return {
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    body: (row.body as string) ?? "",
    link: (row.link as string) ?? null,
    read: Boolean(row.read),
    createdAt: row.created_at as string
  };
}

export async function listNotifications(
  admin: SupabaseClient,
  userId: string,
  limit = 30
): Promise<HubNotification[]> {
  const { data, error } = await admin
    .from("hub_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapNotification);
}

export async function createNotification(
  admin: SupabaseClient,
  userId: string,
  input: { type: string; title: string; body?: string; link?: string }
) {
  const { error } = await admin.from("hub_notifications").insert({
    user_id: userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    link: input.link ?? null
  });
  if (error && !missing(error.message)) throw new Error(error.message);
}

export async function markNotificationRead(
  admin: SupabaseClient,
  userId: string,
  notificationId: string
) {
  const { error } = await admin
    .from("hub_notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(admin: SupabaseClient, userId: string) {
  const { error } = await admin
    .from("hub_notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error && !missing(error.message)) throw new Error(error.message);
}

export async function unreadNotificationCount(admin: SupabaseClient, userId: string) {
  const { count, error } = await admin
    .from("hub_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) {
    if (missing(error.message)) return 0;
    throw new Error(error.message);
  }
  return count ?? 0;
}
