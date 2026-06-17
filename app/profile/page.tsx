import { redirect } from "next/navigation";
import { ProfileTab } from "@/components/community/profile-tab";
import { ProfileProvider } from "@/components/community/profile-context";
import { RewardsAdminButton } from "@/components/rewards/rewards-admin-button";
import { WavyBackground } from "@/components/wavy-background";
import { fetchOwnProfile } from "@/lib/community/own-profile";
import { hasUserProfile } from "@/lib/community/profile";
import { isGuestUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/auth/login?next=/profile");
  if (isGuestUser(data.user)) redirect("/auth/register?next=/profile");

  const admin = createAdminClient();
  if (!(await hasUserProfile(admin, data.user.id))) {
    redirect("/auth/onboarding");
  }
  const initialProfile = await fetchOwnProfile(admin, data.user.id, data.user.email);

  return (
    <WavyBackground accentColor={initialProfile?.accentColor}>
      <ProfileProvider>
        <RewardsAdminButton />
        <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Mein Profil</h1>
              <p className="text-sm text-muted">Avatar, Bio, Badges & Profil-Style</p>
            </div>
            <Link
              href="/chat"
              prefetch
              className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
            >
              ← Chat
            </Link>
          </div>
          <ProfileTab initialProfile={initialProfile} />
        </div>
      </ProfileProvider>
    </WavyBackground>
  );
}
