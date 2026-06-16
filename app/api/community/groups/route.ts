import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { createGroup, listGroupMessages, listGroups, postGroupMessage } from "@/lib/community/social";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const admin = createAdminClient();
  if (groupId) {
    const messages = await listGroupMessages(admin, groupId);
    return NextResponse.json({ messages });
  }
  const groups = await listGroups(admin, auth.user!.id);
  return NextResponse.json({ groups });
}

const postSchema = z.object({
  action: z.enum(["create", "message"]),
  name: z.string().min(2).max(80).optional(),
  groupId: z.string().uuid().optional(),
  content: z.string().max(4000).optional()
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const admin = createAdminClient();
  if (parsed.data.action === "create") {
    if (!parsed.data.name) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });
    const group = await createGroup(admin, auth.user!.id, parsed.data.name);
    return NextResponse.json({ group });
  }
  if (!parsed.data.groupId || !parsed.data.content?.trim()) {
    return NextResponse.json({ error: "Gruppe oder Nachricht fehlt." }, { status: 400 });
  }
  await postGroupMessage(admin, auth.user!.id, parsed.data.groupId, parsed.data.content.trim());
  return NextResponse.json({ ok: true });
}
