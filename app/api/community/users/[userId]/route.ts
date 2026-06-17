import { NextResponse } from "next/server";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { getPublicProfile } from "@/lib/community/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ userId: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { userId } = await params;
  const quick = new URL(req.url).searchParams.get("quick") === "1";
  const admin = createAdminClient();
  const profile = await getPublicProfile(admin, userId, auth.user!.id, { quick });
  if (!profile) {
    return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ profile });
}
