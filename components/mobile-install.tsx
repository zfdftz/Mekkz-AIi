"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type MobileInstallProps = {
  showMoreLink?: boolean;
};

export function MobileInstall({ showMoreLink = true }: MobileInstallProps) {
  const { t } = useLanguage();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim();
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim();

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installPwa() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <div className="mt-8 flex w-full max-w-md flex-col items-center gap-3">
      {!installed && installEvent ? (
        <button
          type="button"
          onClick={() => void installPwa()}
          className="landing-btn w-full rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-6 py-3 text-sm font-medium transition hover:bg-emerald-500/25"
        >
          {t("landing.installApp")}
        </button>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {playStoreUrl ? (
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10"
          >
            {t("landing.googlePlay")}
          </a>
        ) : (
          <Link
            href="/download"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium opacity-80 transition hover:bg-white/10 hover:opacity-100"
          >
            {t("landing.googlePlay")}
          </Link>
        )}
        {appStoreUrl ? (
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10"
          >
            {t("landing.appStore")}
          </a>
        ) : (
          <Link
            href="/download"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium opacity-80 transition hover:bg-white/10 hover:opacity-100"
          >
            {t("landing.appStore")}
          </Link>
        )}
      </div>

      {showMoreLink ? (
        <p className="max-w-sm text-xs text-muted">
          {!playStoreUrl || !appStoreUrl ? t("landing.installHint") : null}
          {!playStoreUrl || !appStoreUrl ? " " : null}
          <Link href="/download" className="text-primary hover:underline">
            {t("download.more")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
