import { NextResponse } from "next/server";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { createAdminClient } from "@/lib/supabase/admin";

function missing(msg: string) {
  return msg.includes("does not exist") || msg.includes("relation");
}

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pinned_conversations")
    .select("conversation_id, pinned_at")
    .eq("user_id", auth.user!.id)
    .order("pinned_at", { ascending: false });
  if (error) {
    if (missing(error.message)) return NextResponse.json({ pinned: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pinned: (data ?? []).map((r) => r.conversation_id) });
}

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { conversationId, pinned } = await req.json();
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId fehlt." }, { status: 400 });
  }
  const admin = createAdminClient();
  const userId = auth.user!.id;

  if (pinned) {
    const { error } = await admin.from("pinned_conversations").upsert({
      user_id: userId,
      conversation_id: conversationId
    });
    if (error && !missing(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("pinned_conversations")
      .delete()
      .eq("user_id", userId)
      .eq("conversation_id", conversationId);
    if (error && !missing(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
