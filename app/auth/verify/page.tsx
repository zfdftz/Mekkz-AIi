"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { MekkzLogo } from "@/components/mekkz-logo";
import { readJsonResponse } from "@/lib/fetch-json";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

function VerifyForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const otpResult = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email"
      });

      if (otpResult.error) {
        setError(otpResult.error.message);
        return;
      }

      const res = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await readJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        setError(data.error || "Konto konnte nicht fertig eingerichtet werden.");
        return;
      }

      router.push("/chat");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setInfo("");
    setResending(true);

    try {
      const otpRes = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });

      if (otpRes.error) {
        setError(otpRes.error.message);
        return;
      }

      setInfo("Neuer Code wurde kostenlos per E-Mail gesendet.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl p-6">
      <div className="flex justify-center pb-1">
        <MekkzLogo size={56} showText={false} />
      </div>
      <h1 className="text-2xl font-semibold">E-Mail bestätigen</h1>
      <p className="text-sm text-muted">
        Gib den 6-stelligen Code aus deiner E-Mail ein. Der Code ist{" "}
        <strong>30 Minuten</strong> gültig (steht auch in der Mail).
      </p>

      <input
        className="w-full rounded-xl bg-white/10 p-3"
        placeholder="E-Mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="w-full rounded-xl bg-white/10 p-3 text-center text-2xl tracking-[0.45em]"
        placeholder="000000"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        required
      />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-400">{info}</p> : null}

      <button
        className="w-full rounded-xl bg-primary p-3 font-medium disabled:opacity-60"
        disabled={loading || code.length !== 6}
      >
        {loading ? "Bestätige..." : "Konto aktivieren"}
      </button>

      <button
        type="button"
        onClick={() => void resendCode()}
        disabled={resending || !email}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm transition hover:bg-white/10 disabled:opacity-50"
      >
        {resending ? "Sende Code..." : "Code erneut senden"}
      </button>

      <p className="text-sm text-muted">
        Schon bestätigt? <Link href="/auth/login" className="underline">Zum Login</Link>
      </p>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <WavyBackground>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <main className="flex min-h-screen items-center justify-center px-4">
        <Suspense fallback={<div className="glass rounded-2xl p-6">Lade...</div>}>
          <VerifyForm />
        </Suspense>
      </main>
    </WavyBackground>
  );
}
