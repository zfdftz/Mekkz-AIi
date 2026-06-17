import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deletePendingRegistration,
  registrationExpiryMinutes,
  upsertPendingRegistration
} from "@/lib/auth/verification";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben.")
});

async function emailAlreadyRegistered(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    if (data.users.some((user) => user.email?.toLowerCase() === email && !user.is_anonymous)) {
      return true;
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const admin = createAdminClient();
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Ungültige Eingabe." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;

    if (await emailAlreadyRegistered(admin, email)) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits registriert. Bitte einloggen." },
        { status: 409 }
      );
    }

    await upsertPendingRegistration(admin, email, password);

    return NextResponse.json({
      ok: true,
      email,
      expiresInMinutes: registrationExpiryMinutes(),
      message:
        "Passwort gespeichert. Supabase sendet dir jetzt den kostenlosen 6-stelligen Code per E-Mail."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registrierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "E-Mail fehlt." }, { status: 400 });
    }
    await deletePendingRegistration(admin, email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Abbruch fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
