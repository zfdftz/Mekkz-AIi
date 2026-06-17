"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { MekkzLogo } from "@/components/mekkz-logo";
import { readJsonResponse } from "@/lib/fetch-json";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/community/profile-rules";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/onboarding");
        if (res.status === 401) {
          router.replace("/auth/login");
          return;
        }
        const data = await readJsonResponse<{
          needsOnboarding?: boolean;
          username?: string;
          birthday?: string;
        }>(res);
        if (!cancelled) {
          if (!data.needsOnboarding) {
            router.replace("/chat");
            return;
          }
          if (data.username) setUsername(data.username);
          if (data.birthday) setBirthday(data.birthday);
        }
      } catch {
        if (!cancelled) setError("Status konnte nicht geladen werden.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void checkStatus();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, birthday })
      });
      const data = await readJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        setError(data.error || "Profil konnte nicht gespeichert werden.");
        return;
      }

      router.push("/chat");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <WavyBackground>
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="glass rounded-2xl p-6 text-sm text-muted">Lade...</div>
        </main>
      </WavyBackground>
    );
  }

  return (
    <WavyBackground>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <form onSubmit={onSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl p-6">
          <div className="flex justify-center pb-1">
            <MekkzLogo size={56} showText={false} />
          </div>
          <h1 className="text-2xl font-semibold">Willkommen bei Mekkz!</h1>
          <p className="text-sm text-muted">
            Fast geschafft — sag uns, wie wir dich nennen sollen und wann du Geburtstag hast.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Wie sollen wir dich nennen?</label>
            <input
              className="w-full rounded-xl bg-white/10 p-3"
              placeholder={`Profilname (${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} Zeichen)`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={USERNAME_MIN_LENGTH}
              maxLength={USERNAME_MAX_LENGTH}
              pattern="[\w.-]+"
              required
              autoFocus
            />
            <p className="mt-1 text-[11px] text-muted">
              Das ist dein @Name im Profil und in der Community.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Wann hast du Geburtstag?</label>
            <input
              className="w-full rounded-xl bg-white/10 p-3"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            className="w-full rounded-xl bg-primary p-3 font-medium disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Speichere..." : "Weiter zu Mekkz"}
          </button>
        </form>
      </main>
    </WavyBackground>
  );
}
