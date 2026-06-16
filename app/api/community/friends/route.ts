import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  listFriendMessages,
  listFriendRequests,
  listFriends,
  listIncomingFriendRequests,
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
  const userId = auth.user!.id;
  if (friendId) {
    const messages = await listFriendMessages(admin, userId, friendId);
    return NextResponse.json({ messages });
  }
  const [friends, requests, incoming] = await Promise.all([
    listFriends(admin, userId),
    listFriendRequests(admin, userId),
    listIncomingFriendRequests(admin, userId)
  ]);
  const outgoingPending = requests.filter(
    (r) => r.status === "pending" && r.fromUserId === userId
  );
  return NextResponse.json({ friends, requests, incoming, outgoingPending });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), username: z.string().min(3).max(32) }),
  z.object({ action: z.literal("respond"), requestId: z.string().uuid(), accept: z.boolean() }),
  z.object({
    action: z.literal("message"),
    friendId: z.string().uuid(),
    content: z.string().min(1).max(4000)
  })
]);

function mapFriendRequestError(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  if (msg === "USER_NOT_FOUND") {
    return NextResponse.json({ error: "User not found.", code: "USER_NOT_FOUND" }, { status: 404 });
  }
  if (msg === "SELF_ADD") {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst hinzufügen.", code: "SELF_ADD" },
      { status: 400 }
    );
  }
  if (/mindestens|Benutzername/i.test(msg)) {
    return NextResponse.json({ error: msg, code: "INVALID_USERNAME" }, { status: 400 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Anfrage fehlgeschlagen." },
    { status: 500 }
  );
}

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Benutzername (min. 3 Zeichen)." }, { status: 400 });
  }
  const admin = createAdminClient();
  const userId = auth.user!.id;
  if (parsed.data.action === "request") {
    try {
      const result = await sendFriendRequest(admin, userId, parsed.data.username);
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      return mapFriendRequestError(error);
    }
  }
  if (parsed.data.action === "respond") {
    try {
      await respondFriendRequest(admin, userId, parsed.data.requestId, parsed.data.accept);
      return NextResponse.json({
        ok: true,
        message: parsed.data.accept ? "Freundschaft angenommen." : "Anfrage abgelehnt."
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Fehler." },
        { status: 400 }
      );
    }
  }
  await sendFriendMessage(admin, userId, parsed.data.friendId, parsed.data.content);
  return NextResponse.json({ ok: true });
}
