import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  createBoard,
  generateTasksFromText,
  listBoards,
  listBoardNodes,
  listCalendarEvents,
  listNoteFolders,
  listNotes,
  listReminders,
  listTasks,
  parseReminderFromText,
  suggestBoardIdeas,
  summarizeNote,
  upsertBoardNode,
  upsertCalendarEvent,
  upsertNote,
  upsertReminder,
  upsertTask,
  deleteTask
} from "@/lib/community/productivity";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") ?? "tasks";
  const admin = createAdminClient();
  const userId = auth.user!.id;

  switch (resource) {
    case "tasks":
      return NextResponse.json({ tasks: await listTasks(admin, userId) });
    case "calendar":
      return NextResponse.json({ events: await listCalendarEvents(admin, userId) });
    case "reminders":
      return NextResponse.json({ reminders: await listReminders(admin, userId) });
    case "notes":
      return NextResponse.json({
        folders: await listNoteFolders(admin, userId),
        notes: await listNotes(admin, userId, searchParams.get("q") ?? undefined)
      });
    case "boards":
      return NextResponse.json({ boards: await listBoards(admin, userId) });
    case "board-nodes": {
      const boardId = searchParams.get("boardId");
      if (!boardId) return NextResponse.json({ error: "boardId fehlt." }, { status: 400 });
      return NextResponse.json({ nodes: await listBoardNodes(admin, boardId) });
    }
    default:
      return NextResponse.json({ error: "Unbekannte Resource." }, { status: 400 });
  }
}

const bodySchema = z.object({
  resource: z.enum(["tasks", "calendar", "reminders", "notes", "boards"]),
  action: z.string(),
  payload: z.record(z.unknown()).optional()
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const admin = createAdminClient();
  const userId = auth.user!.id;
  const { resource, action, payload = {} } = parsed.data;

  try {
    if (resource === "tasks") {
      if (action === "generate") {
        const count = await generateTasksFromText(admin, userId, String(payload.text ?? ""));
        return NextResponse.json({ count, tasks: await listTasks(admin, userId) });
      }
      if (action === "delete") {
        await deleteTask(admin, userId, String(payload.id));
        return NextResponse.json({ tasks: await listTasks(admin, userId) });
      }
      const id = await upsertTask(admin, userId, payload as never);
      return NextResponse.json({ id, tasks: await listTasks(admin, userId) });
    }

    if (resource === "calendar") {
      const id = await upsertCalendarEvent(admin, userId, payload as never);
      return NextResponse.json({ id, events: await listCalendarEvents(admin, userId) });
    }

    if (resource === "reminders") {
      if (action === "parse") {
        const parsedReminder = await parseReminderFromText(String(payload.text ?? ""));
        return NextResponse.json({ parsed: parsedReminder });
      }
      const id = await upsertReminder(admin, userId, payload as never);
      return NextResponse.json({ id, reminders: await listReminders(admin, userId) });
    }

    if (resource === "notes") {
      if (action === "summarize") {
        const summary = await summarizeNote(String(payload.content ?? ""));
        return NextResponse.json({ summary });
      }
      const id = await upsertNote(admin, userId, payload as never);
      return NextResponse.json({
        id,
        notes: await listNotes(admin, userId),
        folders: await listNoteFolders(admin, userId)
      });
    }

    if (resource === "boards") {
      if (action === "create") {
        const board = await createBoard(admin, userId, String(payload.title ?? "Brainstorm"));
        return NextResponse.json({ board, boards: await listBoards(admin, userId) });
      }
      if (action === "suggest") {
        const ideas = await suggestBoardIdeas(String(payload.topic ?? ""));
        return NextResponse.json({ ideas });
      }
      const id = await upsertBoardNode(admin, userId, payload as never);
      return NextResponse.json({
        id,
        nodes: await listBoardNodes(admin, String(payload.boardId))
      });
    }

    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 500 }
    );
  }
}
