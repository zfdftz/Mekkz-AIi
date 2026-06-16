import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  listFriendMessages,
  listFriendRequests,
  listFriends,
  respondFriendRequest,
  sendFriendMessage,
  sendFriendRequest
} from "@/lib/community/social";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const friendId = searchParams.get("friendId");
  const admin = createAdminClient();
  if (friendId) {
    const messages = await listFriendMessages(admin, auth.user!.id, friendId);
    return NextResponse.json({ messages });
  }
  const [friends, requests] = await Promise.all([
    listFriends(admin, auth.user!.id),
    listFriendRequests(admin, auth.user!.id)
  ]);
  return NextResponse.json({ friends, requests });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), username: z.string().min(3) }),
  z.object({ action: z.literal("respond"), requestId: z.string().uuid(), accept: z.boolean() }),
  z.object({
    action: z.literal("message"),
    friendId: z.string().uuid(),
    content: z.string().min(1).max(4000)
  })
]);

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const admin = createAdminClient();
  const userId = auth.user!.id;
  if (parsed.data.action === "request") {
    await sendFriendRequest(admin, userId, parsed.data.username);
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "respond") {
    await respondFriendRequest(admin, userId, parsed.data.requestId, parsed.data.accept);
    return NextResponse.json({ ok: true });
  }
  await sendFriendMessage(admin, userId, parsed.data.friendId, parsed.data.content);
  return NextResponse.json({ ok: true });
}
