"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsPanel } from "@/components/settings-panel";
import { WavyBackground } from "@/components/wavy-background";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [open, setOpen] = useState(true);
  const [userId, setUserId] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
      setUserEmail(user?.email ?? undefined);
    });
  }, [supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <WavyBackground>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Einstellungen</h1>
          <button onClick={() => setOpen(true)} className="glass rounded-xl p-2">
            <Settings size={18} />
          </button>
        </div>
        <p className="text-sm text-muted">
          Sprache, Kommunikation (Stil-Lernen), Theme, Farben und Konto.
        </p>
        <Link href="/chat" className="btn-primary mt-6 inline-flex w-fit rounded-xl px-4 py-2">
          Zurück zum Chat
        </Link>
      </main>
      <SettingsPanel
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        userEmail={userEmail}
        onLogout={() => void handleLogout()}
      />
    </WavyBackground>
  );
}
