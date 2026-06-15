import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearUserMemories,
  deleteUserMemory,
  listUserMemories,
  saveUserMemory
} from "@/lib/memory";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function assertUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return null;
  }
  return user;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  const user = await assertUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const admin = createAdminClient();
  const memories = await listUserMemories(admin, userId);

  return NextResponse.json({ memories });
}

const saveSchema = z.object({
  userId: z.string().uuid(),
  memory: z.string().min(1).max(400),
  category: z
    .enum(["general", "preference", "interest", "fact", "conversation"])
    .optional()
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = saveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { userId, memory, category } = parsed.data;
  const user = await assertUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const id = await saveUserMemory(admin, userId, memory, {
      category,
      source: "manual",
      importance: 3
    });
    const memories = await listUserMemories(admin, userId);
    return NextResponse.json({ id, memories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const deleteSchema = z.object({
  userId: z.string().uuid(),
  memoryId: z.string().uuid().optional(),
  clearAll: z.boolean().optional()
});

export async function DELETE(req: Request) {
  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { userId, memoryId, clearAll } = parsed.data;
  const user = await assertUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    if (clearAll) {
      await clearUserMemories(admin, userId);
      return NextResponse.json({ memories: [] });
    }

    if (!memoryId) {
      return NextResponse.json({ error: "memoryId fehlt." }, { status: 400 });
    }

    await deleteUserMemory(admin, userId, memoryId);
    const memories = await listUserMemories(admin, userId);
    return NextResponse.json({ memories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
