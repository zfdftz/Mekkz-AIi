"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { FormEvent, useState } from "react";
import { GuestEntryButton } from "@/components/guest-entry-button";
import { MekkzLogo } from "@/components/mekkz-logo";
import { OAuthSignInButtons } from "@/components/oauth-sign-in-buttons";
import { readJsonResponse } from "@/lib/fetch-json";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await readJsonResponse<{ error?: string; email?: string }>(res);

      if (!res.ok) {
        setError(data.error || "Registrierung fehlgeschlagen.");
        return;
      }

      const otpRes = await supabase.auth.signInWithOtp({
        email: data.email || email,
        options: {
          shouldCreateUser: true
        }
      });

      if (otpRes.error) {
        setError(otpRes.error.message);
        return;
      }

      router.push(
        `/auth/verify?email=${encodeURIComponent(data.email || email)}` as Route
      );
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-semibold">Registrieren</h1>
          <p className="text-sm text-muted">
            Erstelle dein Konto mit E-Mail und Passwort. Danach erhältst du einen{" "}
            <strong>6-stelligen Code per E-Mail</strong>. Profilname und Geburtstag legst du nach
            der Anmeldung fest.
          </p>

          <OAuthSignInButtons />

          <input
            className="w-full rounded-xl bg-white/10 p-3"
            placeholder="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl bg-white/10 p-3"
            type="password"
            placeholder="Passwort (min. 6 Zeichen)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            className="w-full rounded-xl bg-primary p-3 font-medium disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Sende Code..." : "Code per E-Mail senden"}
          </button>
          <p className="text-sm text-muted">
            Bereits ein Konto? <Link href="/auth/login" className="underline">Anmelden</Link>
          </p>
          <div className="border-t border-white/10 pt-4">
            <GuestEntryButton />
          </div>
        </form>
      </main>
    </WavyBackground>
  );
}
