import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubProject, HubWorkspace, WorkspaceType } from "./types";

function missing(msg: string) {
  return msg.includes("does not exist") || msg.includes("relation");
}

function mapWorkspace(row: Record<string, unknown>, memberCount?: number): HubWorkspace {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    workspaceType: row.workspace_type as WorkspaceType,
    description: (row.description as string) ?? "",
    memberCount,
    createdAt: row.created_at as string
  };
}

function mapProject(row: Record<string, unknown>): HubProject {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    status: row.status as "active" | "archived",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

export async function ensurePersonalWorkspace(
  admin: SupabaseClient,
  userId: string
): Promise<HubWorkspace | null> {
  const existing = await listWorkspaces(admin, userId);
  const personal = existing.find((w) => w.workspaceType === "personal");
  if (personal) return personal;

  return createWorkspace(admin, userId, {
    name: "Persönlicher Workspace",
    workspaceType: "personal",
    description: "Dein privater Mekkz Hub Bereich"
  });
}

export async function listWorkspaces(
  admin: SupabaseClient,
  userId: string
): Promise<HubWorkspace[]> {
  const { data: memberships, error: memErr } = await admin
    .from("hub_workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);
  if (memErr) {
    if (missing(memErr.message)) return [];
    throw new Error(memErr.message);
  }

  const ids = (memberships ?? []).map((m) => m.workspace_id as string);
  if (ids.length === 0) {
    const created = await ensurePersonalWorkspace(admin, userId);
    return created ? [created] : [];
  }

  const { data, error } = await admin
    .from("hub_workspaces")
    .select("*")
    .in("id", ids)
    .order("updated_at", { ascending: false });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapWorkspace(row));
}

export async function createWorkspace(
  admin: SupabaseClient,
  userId: string,
  input: { name: string; workspaceType: WorkspaceType; description?: string }
): Promise<HubWorkspace> {
  const { data, error } = await admin
    .from("hub_workspaces")
    .insert({
      owner_id: userId,
      name: input.name.trim(),
      workspace_type: input.workspaceType,
      description: input.description?.trim() ?? ""
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const ws = mapWorkspace(data);
  await admin.from("hub_workspace_members").insert({
    workspace_id: ws.id,
    user_id: userId,
    role: "owner"
  });
  return ws;
}

export async function joinWorkspace(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string
) {
  const { error } = await admin.from("hub_workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "member"
  });
  if (error) throw new Error(error.message);
}

export async function listProjects(
  admin: SupabaseClient,
  userId: string,
  workspaceId?: string,
  includeArchived = false
): Promise<HubProject[]> {
  const { data: memberRows } = await admin
    .from("hub_project_members")
    .select("project_id")
    .eq("user_id", userId);
  const memberIds = (memberRows ?? []).map((r) => r.project_id as string);

  let query = admin.from("hub_projects").select("*").order("updated_at", { ascending: false });
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  if (!includeArchived) query = query.eq("status", "active");

  const { data, error } = await query;
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((p) => p.owner_id === userId || memberIds.includes(p.id as string))
    .map(mapProject);
}

export async function createProject(
  admin: SupabaseClient,
  userId: string,
  input: { workspaceId: string; name: string; description?: string }
): Promise<HubProject> {
  const { data, error } = await admin
    .from("hub_projects")
    .insert({
      workspace_id: input.workspaceId,
      owner_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() ?? ""
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const project = mapProject(data);
  await admin.from("hub_project_members").insert({
    project_id: project.id,
    user_id: userId,
    role: "owner"
  });
  return project;
}

export async function updateProject(
  admin: SupabaseClient,
  userId: string,
  projectId: string,
  patch: { name?: string; description?: string; status?: "active" | "archived" }
): Promise<HubProject> {
  const { data, error } = await admin
    .from("hub_projects")
    .update({
      ...(patch.name != null ? { name: patch.name.trim() } : {}),
      ...(patch.description != null ? { description: patch.description.trim() } : {}),
      ...(patch.status != null ? { status: patch.status } : {}),
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId)
    .eq("owner_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapProject(data);
}

export async function searchProjects(
  admin: SupabaseClient,
  userId: string,
  q: string
): Promise<HubProject[]> {
  const projects = await listProjects(admin, userId, undefined, true);
  const needle = q.toLowerCase();
  return projects.filter(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      p.description.toLowerCase().includes(needle)
  );
}

export {
  mapProject,
  mapWorkspace
};
