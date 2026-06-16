import { NextResponse } from "next/server";
import { isGuestUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function requireRegisteredUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || isGuestUser(user)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Bitte anmelden — Community-Features sind nur für registrierte Nutzer." },
        { status: 401 }
      )
    };
  }

  return { user, error: null };
}
