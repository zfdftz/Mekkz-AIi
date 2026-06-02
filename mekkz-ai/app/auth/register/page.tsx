"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegisterPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);
    setSuccess(
      "Bestätigungs-E-Mail wurde gesendet. Bitte bestätige deine E-Mail, bevor du dich einloggst."
    );
  }

  return (
    <WavyBackground>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <main className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={onSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">Registrieren</h1>
        <input className="w-full rounded-xl bg-white/10 p-3" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl bg-white/10 p-3" type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
        <button className="w-full rounded-xl bg-primary p-3 font-medium">Konto erstellen</button>
        <p className="text-sm text-muted">
          Bereits ein Konto? <Link href="/auth/login" className="underline">Login</Link>
        </p>
        </form>
      </main>
    </WavyBackground>
  );
}
