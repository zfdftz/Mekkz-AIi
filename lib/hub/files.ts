import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubFile, HubFolder } from "./types";

function missing(msg: string) {
  return msg.includes("does not exist") || msg.includes("relation");
}

function mapFile(row: Record<string, unknown>): HubFile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    workspaceId: (row.workspace_id as string) ?? null,
    projectId: (row.project_id as string) ?? null,
    folderId: (row.folder_id as string) ?? null,
    name: row.name as string,
    mimeType: row.mime_type as string,
    sizeBytes: row.size_bytes as number,
    storagePath: (row.storage_path as string) ?? null,
    contentText: (row.content_text as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function mapFolder(row: Record<string, unknown>): HubFolder {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    workspaceId: (row.workspace_id as string) ?? null,
    projectId: (row.project_id as string) ?? null,
    parentId: (row.parent_id as string) ?? null,
    name: row.name as string,
    createdAt: row.created_at as string
  };
}

const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "application/json",
  "text/javascript",
  "text/typescript",
  "text/x-python"
]);

export async function listFiles(
  admin: SupabaseClient,
  userId: string,
  folderId?: string | null
): Promise<HubFile[]> {
  let query = admin
    .from("hub_files")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (folderId) query = query.eq("folder_id", folderId);
  else query = query.is("folder_id", null);

  const { data, error } = await query;
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapFile);
}

export async function listFolders(admin: SupabaseClient, userId: string): Promise<HubFolder[]> {
  const { data, error } = await admin
    .from("hub_folders")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapFolder);
}

export async function createFolder(
  admin: SupabaseClient,
  userId: string,
  input: { name: string; parentId?: string | null; workspaceId?: string | null; projectId?: string | null }
): Promise<HubFolder> {
  const { data, error } = await admin
    .from("hub_folders")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      parent_id: input.parentId ?? null,
      workspace_id: input.workspaceId ?? null,
      project_id: input.projectId ?? null
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapFolder(data);
}

export async function uploadFileRecord(
  admin: SupabaseClient,
  userId: string,
  input: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    contentText?: string | null;
    folderId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
  }
): Promise<HubFile> {
  const { data, error } = await admin
    .from("hub_files")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      content_text: input.contentText ?? null,
      folder_id: input.folderId ?? null,
      workspace_id: input.workspaceId ?? null,
      project_id: input.projectId ?? null
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapFile(data);
}

export async function renameFile(
  admin: SupabaseClient,
  userId: string,
  fileId: string,
  name: string
): Promise<HubFile> {
  const { data, error } = await admin
    .from("hub_files")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", fileId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapFile(data);
}

export async function deleteFile(admin: SupabaseClient, userId: string, fileId: string) {
  const { error } = await admin.from("hub_files").delete().eq("id", fileId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function searchFiles(
  admin: SupabaseClient,
  userId: string,
  q: string
): Promise<HubFile[]> {
  const { data, error } = await admin
    .from("hub_files")
    .select("*")
    .eq("user_id", userId)
    .or(`name.ilike.%${q}%,content_text.ilike.%${q}%`)
    .limit(20);
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapFile);
}

export function extractTextContent(file: File): Promise<string | null> {
  if (!TEXT_MIMES.has(file.type) && !file.name.match(/\.(txt|md|json|js|ts|tsx|jsx|py|css|html)$/i)) {
    return Promise.resolve(null);
  }
  return file.text().then((t) => t.slice(0, 50000)).catch(() => null);
}

export { TEXT_MIMES };
