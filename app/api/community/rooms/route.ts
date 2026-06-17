import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  getRoomMessageCooldownSeconds,
  joinRoom,
  leaveRoom,
  listRoomMessages,
  listRooms,
  postRoomMessage,
  RoomMessageCooldownError,
  roomMessageCooldownText
} from "@/lib/community/social";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserLanguage } from "@/lib/user-language";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const admin = createAdminClient();
  if (roomId) {
    const [messages, messageCooldownSeconds] = await Promise.all([
      listRoomMessages(admin, roomId),
      getRoomMessageCooldownSeconds(admin, auth.user!.id, roomId)
    ]);
    return NextResponse.json({ messages, messageCooldownSeconds });
  }
  const rooms = await listRooms(admin, searchParams.get("q") ?? undefined);
  return NextResponse.json({ rooms });
}

const postSchema = z.object({
  action: z.enum(["join", "leave", "message"]),
  roomId: z.string().uuid(),
  content: z.string().max(4000).optional()
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const admin = createAdminClient();
  const userId = auth.user!.id;
  const { action, roomId, content } = parsed.data;
  if (action === "join") {
    await joinRoom(admin, userId, roomId);
    return NextResponse.json({ ok: true });
  }
  if (action === "leave") {
    await leaveRoom(admin, userId, roomId);
    return NextResponse.json({ ok: true });
  }
  if (!content?.trim()) return NextResponse.json({ error: "Nachricht fehlt." }, { status: 400 });
  try {
    const message = await postRoomMessage(admin, userId, roomId, content.trim());
    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof RoomMessageCooldownError) {
      const language = await resolveUserLanguage(admin, userId, req);
      return NextResponse.json(
        {
          error: roomMessageCooldownText(language, err.retryAfterSeconds),
          code: err.code,
          retryAfterSeconds: err.retryAfterSeconds
        },
        { status: 429 }
      );
    }
    throw err;
  }
}
