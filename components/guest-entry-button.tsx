"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

export function GuestEntryButton({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function continueAsGuest() {
    setError("");
    setLoading(true);

    const { error: guestError } = await supabase.auth.signInAnonymously();
    setLoading(false);

    if (guestError) {
      setError(
        guestError.message.includes("anonymous")
          ? t("guest.anonymousDisabled")
          : guestError.message
      );
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void continueAsGuest()}
        disabled={loading}
        className="landing-btn min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-60"
      >
        {loading ? t("guest.starting") : t("guest.continue")}
      </button>
      {error ? <p className="max-w-sm text-center text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
