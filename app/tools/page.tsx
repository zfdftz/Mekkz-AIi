import { redirect } from "next/navigation";
import { ToolsHub } from "@/components/tools-hub";
import { WavyBackground } from "@/components/wavy-background";
import { createClient } from "@/lib/supabase/server";

export default async function ToolsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/auth/login");

  return (
    <WavyBackground>
      <ToolsHub userId={data.user.id} />
    </WavyBackground>
  );
}
