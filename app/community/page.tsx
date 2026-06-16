import { redirect } from "next/navigation";
import { CommunityHub } from "@/components/community/community-hub";
import { WavyBackground } from "@/components/wavy-background";
import { isGuestUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/auth/login");
  if (isGuestUser(data.user)) redirect("/auth/register?next=/community");

  return (
    <WavyBackground>
      <CommunityHub userId={data.user.id} />
    </WavyBackground>
  );
}
