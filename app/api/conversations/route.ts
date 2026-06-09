import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ conversations: [] });

  const { data, error } = await admin
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}

const createSchema = z.object({
  userId: z.string().uuid()
});

export async function POST(req: Request) {
  const admin = createAdminClient();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("conversations")
    .insert({ user_id: parsed.data.userId, title: "Neuer Chat" })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data });
}

export async function DELETE(req: Request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const conversationId = searchParams.get("conversationId");

  if (!userId || !conversationId) {
    return NextResponse.json(
      { error: "userId oder conversationId fehlt." },
      { status: 400 }
    );
  }

  const { error, count } = await admin
    .from("conversations")
    .delete({ count: "exact" })
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: "Chat nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
