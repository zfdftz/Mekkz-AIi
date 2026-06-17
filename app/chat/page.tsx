import { redirect } from "next/navigation";
import { ChatUI } from "@/components/chat-ui";
import { isGuestUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/auth/login");

  return (
    <ChatUI
      userId={data.user.id}
      userEmail={data.user.email ?? ""}
      isGuest={isGuestUser(data.user)}
    />
  );
}
