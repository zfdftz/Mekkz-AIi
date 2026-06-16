import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { toggleFollow } from "@/lib/community/public-profile";
import { createAdminClient } from "@/lib/supabase/admin";

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
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 400 }
    );
  }
}
