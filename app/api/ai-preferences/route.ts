import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePersonalityMode } from "@/lib/personality";
import { normalizeTutorLevel } from "@/lib/tutor";
import { getUserAiPreferences, setUserAiPreferences } from "@/lib/user-ai-preferences";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function assertUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return null;
  }
  return user;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt." }, { status: 400 });
  }

  const user = await assertUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const admin = createAdminClient();
  const preferences = await getUserAiPreferences(admin, userId);

  return NextResponse.json({ preferences });
}

const updateSchema = z.object({
  userId: z.string().uuid(),
  personalityMode: z
    .enum(["normal", "gamer", "teacher", "business", "swiss", "genz"])
    .optional(),
  tutorModeEnabled: z.boolean().optional(),
  tutorLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  voiceOutputEnabled: z.boolean().optional(),
  voiceAutoSend: z.boolean().optional()
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { userId, ...patch } = parsed.data;
  const user = await assertUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const admin = createAdminClient();
  const preferences = await setUserAiPreferences(admin, userId, {
    ...(patch.personalityMode
      ? { personalityMode: normalizePersonalityMode(patch.personalityMode) }
      : {}),
    ...(typeof patch.tutorModeEnabled === "boolean"
      ? { tutorModeEnabled: patch.tutorModeEnabled }
      : {}),
    ...(patch.tutorLevel ? { tutorLevel: normalizeTutorLevel(patch.tutorLevel) } : {}),
    ...(typeof patch.voiceOutputEnabled === "boolean"
      ? { voiceOutputEnabled: patch.voiceOutputEnabled }
      : {}),
    ...(typeof patch.voiceAutoSend === "boolean" ? { voiceAutoSend: patch.voiceAutoSend } : {})
  });

  return NextResponse.json({ preferences });
}
