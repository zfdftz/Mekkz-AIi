"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Sparkles, X, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PlanId } from "@/lib/plans";

type PlanState = {
  plan: PlanId;
  imagesToday: number;
  dailyLimit: number | null;
  remaining: number | null;
  imageReadyDelayMs: number;
  planLabel: string;
  hasActiveSubscription?: boolean;
};

export function PlanUpgrade({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    const res = await fetch(`/api/plan?userId=${userId}`);
    const data = await res.json();
    if (res.ok) {
      setPlanState(data.plan);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadPlan();
    const refresh = () => void loadPlan();
    window.addEventListener("mekkz-plan-refresh", refresh);
    return () => window.removeEventListener("mekkz-plan-refresh", refresh);
  }, [loadPlan]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const plan = params.get("plan");

    if (checkout === "success") {
      setOpen(true);
      setMessage(
        plan === "ultra"
          ? "Zahlung erfolgreich. Ultra ist jetzt aktiv."
          : plan === "pro"
            ? "Zahlung erfolgreich. Pro ist jetzt aktiv."
            : "Zahlung erfolgreich. Dein Plan ist aktiv."
      );
      window.history.replaceState({}, "", "/chat");
      window.dispatchEvent(new Event("mekkz-plan-refresh"));
    } else if (checkout === "cancel") {
      setOpen(true);
      setMessage("Zahlung abgebrochen. Es wurde nichts berechnet.");
      window.history.replaceState({}, "", "/chat");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function openModal() {
    setMessage(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function upgrade(plan: PlanId) {
    if (plan === "free") return;
    setUpgrading(plan);
    setMessage(null);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Checkout fehlgeschlagen.");
      setUpgrading(null);
      return;
    }

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    if (data.updated) {
      await loadPlan();
      setMessage(data.message || "Plan aktualisiert.");
    }

    setUpgrading(null);
  }

  async function openBillingPortal() {
    setOpeningPortal(true);
    setMessage(null);

    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Kundenportal konnte nicht geöffnet werden.");
      setOpeningPortal(false);
      return;
    }

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    setOpeningPortal(false);
  }

  const current = planState?.plan ?? "free";
  const badgeLabel =
    current === "free" ? "Free Version" : current === "pro" ? "Pro" : "Ultra";

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={closeModal}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Plan wählen"
            className="flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[hsl(var(--card))] p-4 shadow-2xl md:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h3 className="text-lg font-semibold">Plan wählen</h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg bg-white/10 p-2 transition hover:bg-white/15"
              >
                <X size={16} />
              </button>
            </div>

            {message ? (
              <p className="mb-3 shrink-0 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {message}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
                <div className="min-w-0 flex-1">
                  <PlanCard
                    title="Free Version"
                    price="0 €"
                    icon={<Sparkles size={16} />}
                    active={current === "free"}
                    bullets={[
                      "7 Bilder pro Tag",
                      "5 Bilder an mekkz AI senden pro Tag",
                      "Standard Text-Antworten",
                      "Limitierte Nachrichten"
                    ]}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <PlanCard
                    title="Pro"
                    price="10 € / Monat"
                    icon={<Zap size={16} />}
                    active={current === "pro"}
                    bullets={[
                      "Schnellere Bildgenerierung",
                      "20 Bilder pro Tag",
                      "15 Bilder an mekkz AI senden pro Tag",
                      "Schnellere Antworten",
                      "2x mehr Nachrichten als Free"
                    ]}
                    actionLabel={current === "pro" ? "Aktiv" : "Pro kaufen"}
                    disabled={current === "pro" || upgrading === "pro"}
                    loading={upgrading === "pro"}
                    onAction={() => void upgrade("pro")}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <PlanCard
                    title="Ultra"
                    price="29 € / Monat"
                    icon={<Crown size={16} />}
                    active={current === "ultra"}
                    bullets={[
                      "Noch schnellere Bildgenerierung",
                      "Unbegrenzte Bilderstellung",
                      "Unbegrenzt Bilder an mekkz AI senden",
                      "Noch schnellere Antworten",
                      "Unbegrenzte Nachrichten"
                    ]}
                    actionLabel={current === "ultra" ? "Aktiv" : "Ultra kaufen"}
                    disabled={current === "ultra" || upgrading === "ultra"}
                    loading={upgrading === "ultra"}
                    onAction={() => void upgrade("ultra")}
                    highlight
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 shrink-0 space-y-2">
              {planState?.hasActiveSubscription ? (
                <button
                  type="button"
                  onClick={() => void openBillingPortal()}
                  disabled={openingPortal}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
                >
                  {openingPortal ? "Öffne Kundenportal..." : "Abo verwalten / kündigen"}
                </button>
              ) : null}
              <p className="text-center text-xs text-muted">
                Sichere Zahlung über Stripe. Monatlich kündbar.
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="mt-3 flex w-full shrink-0 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm transition hover:bg-white/10"
      >
        <span className="font-medium">{loading ? "Plan..." : badgeLabel}</span>
        <span className="text-xs text-muted">
          {planState?.remaining != null
            ? `${planState.remaining} Bilder heute`
            : "Unbegrenzt"}
        </span>
      </button>

      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}

function PlanCard({
  title,
  price,
  icon,
  bullets,
  active,
  actionLabel,
  disabled,
  loading,
  onAction,
  highlight
}: {
  title: string;
  price: string;
  icon: React.ReactNode;
  bullets: string[];
  active?: boolean;
  actionLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onAction?: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-xl border p-3 md:p-4 ${
        highlight ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5"
      } ${active ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 font-medium">
          {icon}
          <span className="text-sm md:text-base">{title}</span>
        </div>
        <span className="shrink-0 text-sm">{price}</span>
      </div>
      <ul className="mb-3 flex-1 space-y-1 text-xs leading-snug text-muted">
        {bullets.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || loading}
          className="mt-auto w-full rounded-lg bg-white/10 px-3 py-2 text-sm transition hover:bg-white/15 disabled:opacity-50"
        >
          {loading ? "Weiterleitung..." : actionLabel}
        </button>
      ) : active ? (
        <p className="mt-auto text-xs text-emerald-200">Aktueller Plan</p>
      ) : null}
    </div>
  );
}

export type { PlanState };
