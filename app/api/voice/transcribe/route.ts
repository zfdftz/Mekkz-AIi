import { NextResponse } from "next/server";
import { isGuestUser } from "@/lib/auth/session";
import { transcribeUploadedAudio } from "@/lib/voice/server-transcribe";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || isGuestUser(user)) {
      return NextResponse.json({ error: "Bitte anmelden für Sprachmodus." }, { status: 401 });
    }

    const form = await req.formData();
    const audio = form.get("audio");
    const locale = String(form.get("locale") ?? "de-DE");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Keine Audiodaten erhalten." }, { status: 400 });
    }

    if (audio.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Audioaufnahme zu lang." }, { status: 413 });
    }

    const text = await transcribeUploadedAudio(audio, locale);

    if (!text) {
      return NextResponse.json({ error: "Nichts erkannt — bitte erneut sprechen." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transkription fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
