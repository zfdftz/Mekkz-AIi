import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ChatUI } from "@/components/chat-ui";
import { readLayoutModeFromCookie } from "@/lib/hub/layout-preference";
import { isGuestUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/auth/login");

  const layout = readLayoutModeFromCookie((await cookies()).toString());
  if (layout !== "classic" && !isGuestUser(data.user)) {
    redirect("/hub");
  }

  return (
    <ChatUI
      userId={data.user.id}
      userEmail={data.user.email ?? ""}
      isGuest={isGuestUser(data.user)}
    />
  );
}
