import { NextResponse } from "next/server";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { getFollowerCounts, listFollowers, listFollowing, toggleFollow } from "@/lib/community/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? auth.user!.id;
  const type = searchParams.get("type") ?? "followers";

  if (type === "counts") {
    const admin = createAdminClient();
    const counts = await getFollowerCounts(admin, userId);
    return NextResponse.json(counts);
  }

  const admin = createAdminClient();
  const viewerId = auth.user!.id;
  if (type === "following") {
    const users = await listFollowing(admin, userId, viewerId);
    return NextResponse.json({ users });
  }
  const users = await listFollowers(admin, userId, viewerId);
  return NextResponse.json({ users });
}

const schema = z.object({
  userId: z.string().uuid()
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  try {
    const admin = createAdminClient();
    const result = await toggleFollow(admin, auth.user!.id, parsed.data.userId);
    const counts = await getFollowerCounts(admin, parsed.data.userId);
    return NextResponse.json({ ...result, ...counts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 400 }
    );
  }
}
