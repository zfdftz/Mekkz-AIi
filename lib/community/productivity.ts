import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAIResponse } from "@/lib/ai";
import type {
  BrainstormBoard,
  BrainstormNode,
  CalendarEvent,
  NoteFolder,
  NoteItem,
  ReminderItem,
  TaskItem
} from "./types";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export async function listTasks(admin: SupabaseClient, userId: string): Promise<TaskItem[]> {
  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapTask);
}

export async function upsertTask(
  admin: SupabaseClient,
  userId: string,
  task: Partial<TaskItem> & { title: string }
) {
  const payload = {
    user_id: userId,
    title: task.title,
    description: task.description ?? "",
    priority: task.priority ?? "medium",
    status: task.status ?? "todo",
    due_at: task.dueAt ?? null,
    reminder_at: task.reminderAt ?? null,
    completed_at: task.status === "done" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };
  if (task.id) {
    const { error } = await admin.from("tasks").update(payload).eq("id", task.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return task.id;
  }
  const { data, error } = await admin.from("tasks").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteTask(admin: SupabaseClient, userId: string, taskId: string) {
  await admin.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
}

export async function generateTasksFromText(admin: SupabaseClient, userId: string, text: string) {
  const reply = await generateAIResponse([
    {
      role: "system",
      content:
        "Extract actionable tasks from user text. Return JSON array: [{title, description, priority, dueAt ISO or null}]. Max 8 tasks."
    },
    { role: "user", content: text }
  ]);
  try {
    const parsed = JSON.parse(reply) as Array<{
      title: string;
      description?: string;
      priority?: TaskItem["priority"];
      dueAt?: string | null;
    }>;
    for (const item of parsed) {
      if (item.title) await upsertTask(admin, userId, item);
    }
    return parsed.length;
  } catch {
    await upsertTask(admin, userId, { title: text.slice(0, 120), description: text });
    return 1;
  }
}

export async function listCalendarEvents(admin: SupabaseClient, userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await admin
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("starts_at", { ascending: true });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapEvent);
}

export async function upsertCalendarEvent(
  admin: SupabaseClient,
  userId: string,
  event: Partial<CalendarEvent> & { title: string; startsAt: string; endsAt: string }
) {
  const payload = {
    user_id: userId,
    title: event.title,
    description: event.description ?? "",
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    task_id: event.taskId ?? null,
    reminder_at: event.reminderAt ?? null
  };
  if (event.id) {
    const { error } = await admin.from("calendar_events").update(payload).eq("id", event.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return event.id;
  }
  const { data, error } = await admin.from("calendar_events").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function listReminders(admin: SupabaseClient, userId: string): Promise<ReminderItem[]> {
  const { data, error } = await admin
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("remind_at", { ascending: true });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(mapReminder);
}

export async function upsertReminder(
  admin: SupabaseClient,
  userId: string,
  item: Partial<ReminderItem> & { title: string; remindAt: string }
) {
  const payload = {
    user_id: userId,
    title: item.title,
    remind_at: item.remindAt,
    recurrence: item.recurrence ?? null,
    is_done: item.isDone ?? false
  };
  if (item.id) {
    await admin.from("reminders").update(payload).eq("id", item.id).eq("user_id", userId);
    return item.id;
  }
  const { data, error } = await admin.from("reminders").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function parseReminderFromText(text: string) {
  const reply = await generateAIResponse([
    {
      role: "system",
      content:
        'Parse reminder intent. Return JSON: {"title":"...","remindAt":"ISO8601","recurrence":null or "daily|weekly"}'
    },
    { role: "user", content: text }
  ]);
  return JSON.parse(reply) as { title: string; remindAt: string; recurrence?: string | null };
}

export async function listNoteFolders(admin: SupabaseClient, userId: string): Promise<NoteFolder[]> {
  const { data, error } = await admin.from("note_folders").select("id, name").eq("user_id", userId);
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((f) => ({ id: f.id, name: f.name }));
}

export async function listNotes(admin: SupabaseClient, userId: string, search?: string): Promise<NoteItem[]> {
  let query = admin
    .from("notes")
    .select("id, folder_id, title, content, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (search?.trim()) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((n) => ({
    id: n.id,
    folderId: n.folder_id,
    title: n.title,
    content: n.content,
    updatedAt: n.updated_at
  }));
}

export async function upsertNote(
  admin: SupabaseClient,
  userId: string,
  note: Partial<NoteItem> & { title: string; content: string }
) {
  const payload = {
    user_id: userId,
    folder_id: note.folderId ?? null,
    title: note.title,
    content: note.content,
    updated_at: new Date().toISOString()
  };
  if (note.id) {
    await admin.from("notes").update(payload).eq("id", note.id).eq("user_id", userId);
    return note.id;
  }
  const { data, error } = await admin.from("notes").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function summarizeNote(content: string) {
  return generateAIResponse([
    { role: "system", content: "Summarize the note concisely in the user's language." },
    { role: "user", content }
  ]);
}

export async function createBoard(admin: SupabaseClient, userId: string, title: string) {
  const { data, error } = await admin
    .from("brainstorm_boards")
    .insert({ user_id: userId, title: title.trim().slice(0, 120) })
    .select("id, title, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, title: data.title as string, updatedAt: data.updated_at as string };
}

export async function listBoards(admin: SupabaseClient, userId: string): Promise<BrainstormBoard[]> {
  const { data, error } = await admin
    .from("brainstorm_boards")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((b) => ({ id: b.id, title: b.title, updatedAt: b.updated_at }));
}

export async function listBoardNodes(admin: SupabaseClient, boardId: string): Promise<BrainstormNode[]> {
  const { data, error } = await admin.from("brainstorm_nodes").select("*").eq("board_id", boardId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNode);
}

export async function upsertBoardNode(
  admin: SupabaseClient,
  userId: string,
  node: Partial<BrainstormNode> & { boardId: string; content: string }
) {
  const payload = {
    board_id: node.boardId,
    node_type: node.nodeType ?? "text",
    content: node.content,
    pos_x: node.posX ?? 0,
    pos_y: node.posY ?? 0,
    width: node.width ?? 220,
    height: node.height ?? 120
  };
  if (node.id) {
    await admin.from("brainstorm_nodes").update(payload).eq("id", node.id);
    return node.id;
  }
  const { data, error } = await admin.from("brainstorm_nodes").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await admin
    .from("brainstorm_boards")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", node.boardId)
    .eq("user_id", userId);
  return data.id as string;
}

export async function deleteBoardNode(
  admin: SupabaseClient,
  userId: string,
  boardId: string,
  nodeId: string
) {
  const { data: board } = await admin
    .from("brainstorm_boards")
    .select("id")
    .eq("id", boardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!board) throw new Error("Board nicht gefunden.");
  const { error } = await admin.from("brainstorm_nodes").delete().eq("id", nodeId).eq("board_id", boardId);
  if (error) throw new Error(error.message);
}

export async function suggestBoardIdeas(topic: string) {
  const reply = await generateAIResponse([
    {
      role: "system",
      content: "Return 5 short brainstorm ideas as JSON string array."
    },
    { role: "user", content: topic }
  ]);
  try {
    return JSON.parse(reply) as string[];
  } catch {
    return reply.split("\n").filter(Boolean).slice(0, 5);
  }
}

function mapTask(row: Record<string, unknown>): TaskItem {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    priority: row.priority as TaskItem["priority"],
    status: row.status as TaskItem["status"],
    dueAt: (row.due_at as string) ?? null,
    reminderAt: (row.reminder_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null
  };
}

function mapEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    taskId: (row.task_id as string) ?? null,
    reminderAt: (row.reminder_at as string) ?? null
  };
}

function mapReminder(row: Record<string, unknown>): ReminderItem {
  return {
    id: row.id as string,
    title: row.title as string,
    remindAt: row.remind_at as string,
    recurrence: (row.recurrence as string) ?? null,
    isDone: Boolean(row.is_done)
  };
}

function mapNode(row: Record<string, unknown>): BrainstormNode {
  return {
    id: row.id as string,
    boardId: row.board_id as string,
    nodeType: row.node_type as BrainstormNode["nodeType"],
    content: row.content as string,
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
    width: Number(row.width),
    height: Number(row.height)
  };
}
