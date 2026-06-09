import { NextResponse } from "next/server";
import { syncUserPlanFromStripe } from "@/lib/stripe-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const origin = url.origin;

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user?.email) {
    try {
      const admin = createAdminClient();
      await syncUserPlanFromStripe(admin, user.id, user.email);
    } catch {
      // Plan sync is best-effort after OAuth login.
    }
  }

  return NextResponse.redirect(`${origin}/chat`);
}
