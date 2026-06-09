import { redirect } from "next/navigation";
import { LandingPageClient } from "@/components/landing-page-client";
import { isGuestUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && !isGuestUser(user)) {
    redirect("/chat");
  }

  return <LandingPageClient />;
}
