import { redirect } from "next/navigation";
import { ChatUI } from "@/components/chat-ui";
import { isGuestUser } from "@/lib/auth/session";
import { isStripeConfigured } from "@/lib/stripe";
import { reconcileUserPlanWithStripe } from "@/lib/stripe-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/auth/login");

  if (!isGuestUser(data.user) && isStripeConfigured() && data.user.email) {
    try {
      const admin = createAdminClient();
      await reconcileUserPlanWithStripe(admin, data.user.id, data.user.email);
    } catch {
      // Plan sync is best-effort on page load.
    }
  }

  return (
    <ChatUI
      userId={data.user.id}
      userEmail={data.user.email ?? ""}
      isGuest={isGuestUser(data.user)}
    />
  );
}
