import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { MekkzHub } from "@/components/hub/mekkz-hub";
import { readLayoutModeFromCookie } from "@/lib/hub/layout-preference";
import { isGuestUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function HubFallback() {
  return (
    <div className="flex h-[100dvh] items-center justify-center text-sm text-muted">
      Mekkz Hub wird geladen…
    </div>
  );
}

export default async function HubPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/auth/login");
  if (isGuestUser(data.user)) redirect("/auth/register?next=/hub");

  const layout = readLayoutModeFromCookie((await cookies()).toString());
  if (layout === "classic") redirect("/chat");

  return (
    <Suspense fallback={<HubFallback />}>
      <MekkzHub
        userId={data.user.id}
        userEmail={data.user.email ?? ""}
        isGuest={false}
      />
    </Suspense>
  );
}
