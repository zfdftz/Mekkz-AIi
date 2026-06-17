import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultConversationTitle } from "@/lib/i18n/conversation-title";
import { resolveUserLanguage } from "@/lib/user-language";
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
  userId: z.string().uuid(),
  language: z.string().min(2).max(8).optional()
});

export async function POST(req: Request) {
  const admin = createAdminClient();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const language = await resolveUserLanguage(
    admin,
    parsed.data.userId,
    req,
    parsed.data.language
  );
  const title = getDefaultConversationTitle(language);

  const { data, error } = await admin
    .from("conversations")
    .insert({ user_id: parsed.data.userId, title })
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
