"use client";

import Link from "next/link";
import { MobileInstall } from "@/components/mobile-install";
import { useLanguage } from "@/components/language-provider";

export function DownloadPageClient() {
  const { t } = useLanguage();
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim();
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="mb-3 text-3xl font-semibold text-fg">{t("download.title")}</h1>
      <p className="mb-8 text-sm leading-7 text-muted">{t("download.subtitle")}</p>

      <MobileInstall showMoreLink={false} />

      {!playStoreUrl || !appStoreUrl ? (
        <p className="mt-6 max-w-md text-xs leading-6 text-muted">{t("download.storePending")}</p>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link href="/privacy" className="text-primary hover:underline">
          {t("download.privacy")}
        </Link>
        <Link href="/" className="text-primary hover:underline">
          {t("download.backHome")}
        </Link>
      </div>
    </main>
  );
}
