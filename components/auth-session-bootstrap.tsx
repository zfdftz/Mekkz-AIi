"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Hält Session aktiv, synchronisiert Stripe-Plan nach Rückkehr, leitet eingeloggte Nutzer weiter. */
export function AuthSessionBootstrap() {
  const router = useRouter();
  const syncedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const STRIPE_SYNC_KEY = "mekkz_stripe_sync_at";
    const STRIPE_SYNC_INTERVAL_MS = 10 * 60 * 1000;

    async function bootstrap() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || user.is_anonymous) return;

      const path = window.location.pathname;
      if (path === "/" || path === "/auth/login" || path === "/auth/register") {
        router.replace("/chat");
      }

      if (!syncedRef.current) {
        syncedRef.current = true;
        try {
          const lastSync = Number(sessionStorage.getItem(STRIPE_SYNC_KEY) || 0);
          if (Date.now() - lastSync < STRIPE_SYNC_INTERVAL_MS) return;

          await fetch("/api/stripe/sync", { method: "POST" });
          sessionStorage.setItem(STRIPE_SYNC_KEY, String(Date.now()));
        } catch {
          // Best-effort — Plan wird auch über /api/plan aktualisiert.
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && !session.user.is_anonymous) {
        syncedRef.current = false;
        void bootstrap();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
