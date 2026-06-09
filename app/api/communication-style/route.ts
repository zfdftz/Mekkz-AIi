import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getUserCommunicationStyle,
  refreshUserCommunicationStyle,
  setCommunicationStyleEnabled
} from "@/lib/communication-style";
import { createAdminClient } from "@/lib/supabase/admin";

function publicProfile(profile: Awaited<ReturnType<typeof getUserCommunicationStyle>>) {
  return {
    enabled: profile?.enabled ?? true
  };
}

export async function GET(req: Request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  const profile = await getUserCommunicationStyle(admin, userId);

  return NextResponse.json({
    profile: publicProfile(profile)
  });
}

const updateSchema = z.object({
  userId: z.string().uuid(),
  enabled: z.boolean().optional()
});

export async function POST(req: Request) {
  const admin = createAdminClient();
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { userId, enabled } = parsed.data;

  if (typeof enabled === "boolean") {
    await setCommunicationStyleEnabled(admin, userId, enabled);
  }

  await refreshUserCommunicationStyle(admin, userId);
  const profile = await getUserCommunicationStyle(admin, userId);

  return NextResponse.json({ profile: publicProfile(profile) });
}
