import { NextResponse } from "next/server";
import { fetchConversationMessages, rowsToMessages } from "@/lib/chat-storage";
import { getConversationLimitState } from "@/lib/user-plans";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const preferredId = searchParams.get("conversationId");

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: convRows, error: convError } = await admin
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  const conversations = convRows ?? [];
  let activeConversationId: string | null = null;

  if (conversations.length > 0) {
    activeConversationId =
      preferredId && conversations.some((c) => c.id === preferredId)
        ? preferredId
        : conversations[0].id;
  }

  if (!activeConversationId) {
    return NextResponse.json({
      conversations,
      activeConversationId: null,
      messages: [],
      conversationLimit: null
    });
  }

  const [{ data, error }, conversationLimit] = await Promise.all([
    fetchConversationMessages(admin, userId, activeConversationId),
    getConversationLimitState(admin, userId, activeConversationId)
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    conversations,
    activeConversationId,
    messages: rowsToMessages(data ?? []),
    conversationLimit
  });
}
