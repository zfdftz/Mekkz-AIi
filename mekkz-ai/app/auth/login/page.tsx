"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    router.push("/chat");
  }

  return (
    <WavyBackground>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <main className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={onSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <input className="w-full rounded-xl bg-white/10 p-3" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl bg-white/10 p-3" type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className="w-full rounded-xl bg-primary p-3 font-medium">Einloggen</button>
        <p className="text-sm text-muted">
          Kein Konto? <Link href="/auth/register" className="underline">Registrieren</Link>
        </p>
        </form>
      </main>
    </WavyBackground>
  );
}
