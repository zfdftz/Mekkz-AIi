import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { ensureUserProfile, getProfile, touchPresence, updateProfile } from "@/lib/community/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  await ensureUserProfile(admin, auth.user!.id, auth.user!.email);
  await touchPresence(admin, auth.user!.id, true);
  const profile = await getProfile(admin, auth.user!.id);
  return NextResponse.json({ profile });
}

const patchSchema = z.object({
  username: z.string().min(3).max(32).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().nullable().optional()
});

export async function PATCH(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Profildaten." }, { status: 400 });
  const admin = createAdminClient();
  const profile = await updateProfile(admin, auth.user!.id, parsed.data);
  return NextResponse.json({ profile });
}
