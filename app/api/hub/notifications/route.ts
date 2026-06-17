import { NextResponse } from "next/server";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount
} from "@/lib/hub/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const userId = auth.user!.id;
  const [notifications, unread] = await Promise.all([
    listNotifications(admin, userId),
    unreadNotificationCount(admin, userId)
  ]);
  return NextResponse.json({ notifications, unread });
}

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const admin = createAdminClient();
  const userId = auth.user!.id;

  if (body.action === "read-all") {
    await markAllNotificationsRead(admin, userId);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "read" && body.notificationId) {
    await markNotificationRead(admin, userId, body.notificationId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
}
