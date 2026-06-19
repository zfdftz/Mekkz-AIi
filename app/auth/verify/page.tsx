"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { MekkzLogo } from "@/components/mekkz-logo";
import {
  formatOtpResendError,
  formatResendCooldownLabel,
  RESEND_COOLDOWN_SECONDS
} from "@/lib/auth/otp";
import { readJsonResponse } from "@/lib/fetch-json";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

function VerifyForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const mode = searchParams.get("mode") === "login" ? "login" : "register";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  function startCooldown(seconds: number) {
    setCooldownSeconds(Math.max(1, seconds));
  }

  async function redirectAfterLogin() {
    const onboardingRes = await fetch("/api/auth/onboarding");
    const onboardingData = await readJsonResponse<{ needsOnboarding?: boolean }>(onboardingRes);

    if (onboardingData.needsOnboarding) {
      router.push("/auth/onboarding");
    } else {
      router.push("/chat");
    }
    router.refresh();
  }

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

      if (mode === "register") {
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

        router.push("/auth/onboarding");
        router.refresh();
        return;
      }

      await redirectAfterLogin();
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (cooldownSeconds > 0) return;

    setError("");
    setInfo("");
    setResending(true);

    try {
      const otpRes = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: mode !== "login" }
      });

      if (otpRes.error) {
        const formatted = formatOtpResendError(otpRes.error);
        if (formatted.type === "rate_limit") {
          startCooldown(formatted.seconds);
          return;
        }
        setError(formatted.message);
        return;
      }

      setInfo("Code wurde gesendet.");
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setResending(false);
    }
  }

  const resendDisabled = resending || !email || cooldownSeconds > 0;
  const resendLabel =
    resending
      ? "Sende Code..."
      : cooldownSeconds > 0
        ? formatResendCooldownLabel(cooldownSeconds)
        : "Code erneut senden";

  return (
    <form onSubmit={onSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl p-6">
      <div className="flex justify-center pb-1">
        <MekkzLogo size={56} showText={false} />
      </div>
      <h1 className="text-2xl font-semibold">
        {mode === "login" ? "Mit Code anmelden" : "E-Mail bestätigen"}
      </h1>
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
        {loading
          ? mode === "login"
            ? "Melde an..."
            : "Bestätige..."
          : mode === "login"
            ? "Anmelden"
            : "Konto aktivieren"}
      </button>

      <button
        type="button"
        onClick={() => void resendCode()}
        disabled={resendDisabled}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm transition hover:bg-white/10 disabled:opacity-50"
      >
        {resendLabel}
      </button>

      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>
            Lieber mit Passwort? <Link href="/auth/login" className="underline">Zum Login</Link>
          </>
        ) : (
          <>
            Schon bestätigt? <Link href="/auth/login" className="underline">Zum Login</Link>
          </>
        )}
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
