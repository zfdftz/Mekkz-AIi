import type { SupabaseClient } from "@supabase/supabase-js";
import { usernamesByIds } from "./profile";
import type { Clan, ClanMember } from "./types";

export function isClansSchemaMissing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export async function createClan(
  admin: SupabaseClient,
  ownerId: string,
  name: string,
  description: string,
  isPublic: boolean
) {
  const slug = `${slugify(name)}-${ownerId.slice(0, 6)}`;
  const { data, error } = await admin
    .from("clans")
    .insert({ name, slug, description, owner_id: ownerId, is_public: isPublic })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { error: memberError } = await admin.from("clan_members").insert({
    clan_id: data.id,
    user_id: ownerId,
    role: "owner"
  });
  if (memberError) {
    await admin.from("clans").delete().eq("id", data.id);
    throw new Error(memberError.message);
  }
  return mapClan(data);
}

export async function listPublicClans(admin: SupabaseClient, limit = 30): Promise<Clan[]> {
  const { data, error } = await admin
    .from("clans")
    .select("*")
    .eq("is_public", true)
    .order("member_count", { ascending: false })
    .limit(limit);
  if (error) {
    if (isClansSchemaMissing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapClan);
}

export async function getUserClan(admin: SupabaseClient, userId: string): Promise<Clan | null> {
  const { data: membership, error: memberError } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (memberError) {
    if (isClansSchemaMissing(memberError.message)) return null;
    throw new Error(memberError.message);
  }
  if (!membership) return null;

  const { data, error } = await admin
    .from("clans")
    .select("*")
    .eq("id", membership.clan_id)
    .maybeSingle();
  if (error) {
    if (isClansSchemaMissing(error.message)) return null;
    throw new Error(error.message);
  }
  return data ? mapClan(data) : null;
}

export async function listClanMembers(
  admin: SupabaseClient,
  clanId: string
): Promise<ClanMember[]> {
  const { data, error } = await admin
    .from("clan_members")
    .select("user_id, role, joined_at")
    .eq("clan_id", clanId);
  if (error) {
    if (isClansSchemaMissing(error.message)) return [];
    throw new Error(error.message);
  }
  const ids = (data ?? []).map((r) => r.user_id as string);
  const names = await usernamesByIds(admin, ids);
  return (data ?? []).map((row) => ({
    userId: row.user_id as string,
    username: names.get(row.user_id as string) ?? null,
    role: row.role as ClanMember["role"],
    joinedAt: row.joined_at as string
  }));
}

export async function requestJoinClan(admin: SupabaseClient, userId: string, clanId: string) {
  const existing = await getUserClan(admin, userId);
  if (existing) throw new Error("Du bist bereits in einem Clan.");

  const { error } = await admin.from("clan_join_requests").upsert({
    clan_id: clanId,
    user_id: userId,
    status: "pending"
  });
  if (error) throw new Error(error.message);
}

export async function joinPublicClan(admin: SupabaseClient, userId: string, clanId: string) {
  const existing = await getUserClan(admin, userId);
  if (existing) throw new Error("Du bist bereits in einem Clan.");

  const { data: clan, error: clanError } = await admin
    .from("clans")
    .select("is_public")
    .eq("id", clanId)
    .maybeSingle();
  if (clanError) throw new Error(clanError.message);
  if (!clan?.is_public) throw new Error("Clan ist privat — Anfrage senden.");

  const { error } = await admin.from("clan_members").insert({
    clan_id: clanId,
    user_id: userId,
    role: "member"
  });
  if (error) throw new Error(error.message);

  const { data: c } = await admin.from("clans").select("member_count").eq("id", clanId).maybeSingle();
  await admin
    .from("clans")
    .update({ member_count: ((c?.member_count as number) ?? 0) + 1 })
    .eq("id", clanId);
}

function mapClan(row: Record<string, unknown>): Clan {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string) ?? "",
    logoUrl: (row.logo_url as string) ?? null,
    ownerId: row.owner_id as string,
    isPublic: Boolean(row.is_public),
    memberCount: (row.member_count as number) ?? 1,
    createdAt: row.created_at as string
  };
}
