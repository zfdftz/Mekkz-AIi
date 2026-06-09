import { NextResponse } from "next/server";
import { z } from "zod";
import { consumePendingRegistration } from "@/lib/auth/verification";
import { syncUserPlanFromStripe } from "@/lib/stripe-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const completeSchema = z.object({
  email: z.string().email()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = completeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige E-Mail." }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || user.email?.toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Bitte zuerst den E-Mail-Code bestätigen." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const pending = await consumePendingRegistration(admin, email);

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: pending.password,
      email_confirm: true
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    try {
      await syncUserPlanFromStripe(admin, user.id, email);
    } catch {
      // Plan sync is best-effort after registration.
    }

    return NextResponse.json({
      ok: true,
      message: "Konto ist bereit. Du bist eingeloggt."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registrierung konnte nicht abgeschlossen werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
