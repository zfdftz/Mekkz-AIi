import { NextResponse } from "next/server";
import { fetchConversationMessages, rowsToMessages } from "@/lib/chat-storage";
import { getConversationLimitState } from "@/lib/user-plans";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const conversationId = searchParams.get("conversationId");

  if (!userId || !conversationId) {
    return NextResponse.json({ messages: [] });
  }

  const { data, error } = await fetchConversationMessages(admin, userId, conversationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const conversationLimit = await getConversationLimitState(
    admin,
    userId,
    conversationId
  );

  return NextResponse.json({
    messages: rowsToMessages(data ?? []),
    conversationLimit
  });
}
