"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { GuestEntryButton } from "@/components/guest-entry-button";
import { useLanguage } from "@/components/language-provider";
import { MekkzLogo } from "@/components/mekkz-logo";
import { OAuthSignInButtons } from "@/components/oauth-sign-in-buttons";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

function LoginForm() {
  const { t } = useLanguage();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const verified = searchParams.get("verified") === "1";
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const purchasedPlan = searchParams.get("plan");
  const oauthError = searchParams.get("error");

  async function syncPlanAfterLogin() {
    try {
      await fetch("/api/stripe/sync", { method: "POST" });
    } catch {
      // Plan sync is best-effort after login.
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    await syncPlanAfterLogin();
    router.push("/chat");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl p-6">
      <div className="flex justify-center pb-1">
        <MekkzLogo size={56} showText={false} />
      </div>
      <h1 className="text-2xl font-semibold">{t("auth.login.title")}</h1>
      {verified ? (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {t("auth.login.verified")}
        </p>
      ) : null}
      {checkoutSuccess ? (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {t("auth.login.checkoutSuccess")}
          {purchasedPlan === "ultra"
            ? " (Ultra)"
            : purchasedPlan === "pro"
              ? " (Pro)"
              : ""}
        </p>
      ) : null}
      {oauthError ? (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {oauthError === "oauth_missing_code"
            ? t("auth.login.oauthCancelled")
            : decodeURIComponent(oauthError)}
        </p>
      ) : null}

      <OAuthSignInButtons />

      <input
        className="w-full rounded-xl bg-white/10 p-3"
        placeholder={t("auth.login.email")}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="w-full rounded-xl bg-white/10 p-3"
        type="password"
        placeholder={t("auth.login.password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button className="w-full rounded-xl bg-primary p-3 font-medium">{t("auth.login.submit")}</button>
      <p className="text-sm text-muted">
        {t("auth.login.registerPrompt")}{" "}
        <Link href="/auth/register" className="underline">
          {t("auth.login.registerLink")}
        </Link>
      </p>
      <div className="border-t border-white/10 pt-4">
        <GuestEntryButton />
      </div>
    </form>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <WavyBackground>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <main className="flex min-h-screen items-center justify-center px-4">
        <Suspense fallback={<div className="glass rounded-2xl p-6">{t("auth.login.loading")}</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </WavyBackground>
  );
}
