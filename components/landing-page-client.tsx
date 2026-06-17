"use client";

import Link from "next/link";
import { GuestEntryButton } from "@/components/guest-entry-button";
import { useLanguage } from "@/components/language-provider";
import { MekkzLogo } from "@/components/mekkz-logo";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileInstall } from "@/components/mobile-install";
import { AdSenseAd } from "@/components/adsense-ad";

export function LandingPageClient() {
  const { t } = useLanguage();

  return (
    <WavyBackground>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="relative z-10 animate-fade-up">
          <div className="flex flex-col items-center gap-5">
            <MekkzLogo size={112} showText={false} className="justify-center" />
            <h1 className="landing-title text-5xl font-bold tracking-[0.18em] sm:text-6xl md:text-7xl">
              MEKKZ AI
            </h1>
            <p className="max-w-xl text-sm text-muted sm:text-base">{t("landing.tagline")}</p>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            <Link
              href="/auth/login"
              className="landing-btn min-w-[160px] rounded-xl border border-violet-300/35 bg-gradient-to-br from-violet-500/30 via-purple-600/25 to-indigo-600/25 px-6 py-3 text-sm font-medium shadow-glow transition hover:scale-[1.03]"
            >
              {t("landing.login")}
            </Link>
            <Link
              href="/auth/register"
              className="landing-btn min-w-[160px] rounded-xl border border-violet-300/30 bg-violet-500/15 px-6 py-3 text-sm font-medium transition hover:scale-[1.03] hover:bg-violet-500/25"
            >
              {t("landing.register")}
            </Link>
          </div>

          <div className="mt-5">
            <GuestEntryButton />
          </div>

          <MobileInstall />

          <div className="mx-auto mt-10 w-full max-w-xl">
            <AdSenseAd placement="landing" />
          </div>
        </div>
      </main>
    </WavyBackground>
  );
}
