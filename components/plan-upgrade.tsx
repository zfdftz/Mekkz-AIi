"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Sparkles, X, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/language-provider";
import type { LanguageCode } from "@/lib/languages";
import { PLANS, PlanId } from "@/lib/plans";
import {
  getPlanBullets,
  getPlanUsageLabel,
  getProActionLabel,
  getUltraActionLabel
} from "@/lib/i18n/plan-content";
import { readJsonResponse } from "@/lib/fetch-json";
import { AuthRequiredModal } from "./auth-required-modal";

type PlanState = {
  plan: PlanId;
  imagesToday: number;
  dailyLimit: number | null;
  remaining: number | null;
  uploadsToday?: number;
  dailyUploadLimit?: number | null;
  uploadsRemaining?: number | null;
  imageReadyDelayMs: number;
  planLabel: string;
  hasActiveSubscription?: boolean;
  stripePeriodEnd?: string | null;
  scheduledPlan?: PlanId | null;
  scheduledPlanAt?: string | null;
};

function planUsageLabel(state: PlanState | null) {
  if (!state) return null;
  const createLimit = PLANS[state.plan].dailyImageLimit ?? state.dailyLimit;
  const uploadLimit = PLANS[state.plan].dailyUploadLimit ?? state.dailyUploadLimit;
  const createRemaining =
    createLimit == null ? null : Math.max(0, createLimit - (state.imagesToday ?? 0));
  const uploadRemaining =
    uploadLimit == null
      ? null
      : Math.max(0, uploadLimit - (state.uploadsToday ?? 0));

  return { createLimit, createRemaining, uploadLimit, uploadRemaining };
}

function imageQuota(state: PlanState | null) {
  const usage = planUsageLabel(state);
  if (!usage?.createLimit) return null;
  return {
    limit: usage.createLimit,
    remaining: usage.createRemaining ?? 0,
    used: (state?.imagesToday ?? 0)
  };
}

function planBulletsForLanguage(plan: PlanId, language: LanguageCode) {
  return getPlanBullets(language, plan);
}

function applyPlanState(incoming: PlanState): PlanState {
  const createLimit = PLANS[incoming.plan].dailyImageLimit ?? incoming.dailyLimit;
  const uploadLimit =
    PLANS[incoming.plan].dailyUploadLimit ?? incoming.dailyUploadLimit;
  const imagesToday = incoming.imagesToday ?? 0;
  const uploadsToday = incoming.uploadsToday ?? 0;

  return {
    ...incoming,
    imagesToday,
    uploadsToday,
    remaining:
      createLimit == null ? null : Math.max(0, createLimit - imagesToday),
    uploadsRemaining:
      uploadLimit == null ? null : Math.max(0, uploadLimit - uploadsToday)
  };
}

function mergePlanState(prev: PlanState | null, incoming: PlanState): PlanState {
  if (!prev) return applyPlanState(incoming);
  if (incoming.plan === "free" && !incoming.hasActiveSubscription) {
    return applyPlanState(incoming);
  }
  if (prev.plan !== incoming.plan) return applyPlanState(incoming);

  const looksLikeDayReset =
    (incoming.imagesToday ?? 0) === 0 &&
    (incoming.uploadsToday ?? 0) === 0 &&
    ((prev.imagesToday ?? 0) > 0 || (prev.uploadsToday ?? 0) > 0);

  if (looksLikeDayReset) return incoming;

  const imagesToday = Math.max(prev.imagesToday ?? 0, incoming.imagesToday ?? 0);
  const uploadsToday = Math.max(prev.uploadsToday ?? 0, incoming.uploadsToday ?? 0);
  const createLimit = PLANS[incoming.plan].dailyImageLimit ?? incoming.dailyLimit;
  const uploadLimit =
    PLANS[incoming.plan].dailyUploadLimit ?? incoming.dailyUploadLimit;

  return {
    ...incoming,
    imagesToday,
    uploadsToday,
    remaining:
      createLimit == null ? null : Math.max(0, createLimit - imagesToday),
    uploadsRemaining:
      uploadLimit == null ? null : Math.max(0, uploadLimit - uploadsToday)
  };
}

export function PlanUpgrade({
  userId,
  isGuest = false
}: {
  userId: string;
  isGuest?: boolean;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    const res = await fetch(`/api/plan?userId=${userId}&_=${Date.now()}`, {
      cache: "no-store"
    });
    const data = await res.json();
    if (res.ok && data.plan) {
      setPlanState((prev) => mergePlanState(prev, data.plan as PlanState));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadPlan();
    const refresh = () => void loadPlan();
    const applyPlan = (event: Event) => {
      const detail = (event as CustomEvent<PlanState>).detail;
      if (detail?.plan) {
        setPlanState(applyPlanState(detail));
        setLoading(false);
      }
    };
    window.addEventListener("mekkz-plan-refresh", refresh);
    window.addEventListener("mekkz-plan-update", applyPlan);
    return () => {
      window.removeEventListener("mekkz-plan-refresh", refresh);
      window.removeEventListener("mekkz-plan-update", applyPlan);
    };
  }, [loadPlan]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const plan = params.get("plan");

    if (checkout === "success") {
      setOpen(true);
      setMessage(
        plan === "ultra"
          ? t("plan.checkoutSuccessUltra")
          : plan === "pro"
            ? t("plan.checkoutSuccessPro")
            : t("plan.checkoutSuccessGeneric")
      );
      window.history.replaceState({}, "", "/chat");
      void loadPlan();
      window.dispatchEvent(new Event("mekkz-plan-refresh"));
    } else if (checkout === "cancel") {
      setOpen(true);
      setMessage(t("plan.checkoutCancel"));
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
    if (isGuest) {
      setAuthModalOpen(true);
      return;
    }
    setUpgrading(plan);
    setMessage(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const data = await readJsonResponse<{
        error?: string;
        url?: string;
        message?: string;
        updated?: boolean;
        scheduled?: boolean;
      }>(res);

      if (!res.ok) {
        setMessage(data.error || "Checkout fehlgeschlagen.");
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      if (data.updated || data.scheduled) {
        setMessage(data.message || "Plan aktualisiert.");
        void loadPlan();
        return;
      }

      setMessage(data.message || data.error || "Unbekannte Antwort vom Server.");
    } catch {
      setMessage("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setUpgrading(null);
    }
  }

  async function syncPlanFromStripe() {
    if (isGuest) return;
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/sync", { method: "POST" });
      const data = await readJsonResponse<{
        error?: string;
        message?: string;
        synced?: boolean;
      }>(res);
      if (!res.ok) {
        setMessage(data.error || "Plan-Sync fehlgeschlagen.");
        return;
      }
      setMessage(
        data.message ||
          (data.synced ? "Plan von Stripe synchronisiert." : "Kein aktives Abo gefunden.")
      );
      void loadPlan();
    } catch {
      setMessage("Netzwerkfehler beim Plan-Sync.");
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
    if (isGuest) {
      setAuthModalOpen(true);
      return;
    }
    setOpeningPortal(true);
    setMessage(null);

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await readJsonResponse<{ error?: string; url?: string }>(res);

      if (!res.ok) {
        setMessage(data.error || "Kundenportal konnte nicht geöffnet werden.");
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setMessage("Kundenportal konnte nicht geöffnet werden.");
    } catch {
      setMessage("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setOpeningPortal(false);
    }
  }

  const current = planState?.plan ?? "free";
  const hasLiveSubscription = planState?.hasActiveSubscription === true;
  const isPaidPlan =
    !isGuest && hasLiveSubscription && (current === "pro" || current === "ultra");
  const canManageBilling = isPaidPlan;
  const badgeLabel = isGuest
    ? t("common.guest")
    : current === "free"
      ? t("plan.freeTitle")
      : current === "pro"
        ? t("plan.proTitle")
        : t("plan.ultraTitle");

  const proActionLabel = getProActionLabel(
    language,
    current,
    planState?.scheduledPlan,
    planState?.scheduledPlanAt,
    planState?.stripePeriodEnd
  );

  const proDisabled =
    (current === "pro" && hasLiveSubscription) || upgrading === "pro";

  const proOnAction =
    proDisabled ? undefined : () => void upgrade("pro");

  const ultraActionLabel = getUltraActionLabel(language, current);

  const quota = imageQuota(planState);
  const usage = planUsageLabel(planState);

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
            aria-label={t("plan.chooseTitle")}
            className="flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[hsl(var(--card))] p-4 shadow-2xl sm:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h3 className="text-lg font-semibold">{t("plan.chooseTitle")}</h3>
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                <PlanCard
                  title={t("plan.freeTitle")}
                  price={t("plan.freePrice")}
                  icon={<Sparkles size={16} />}
                  active={current === "free"}
                  isCurrentPlan={current === "free"}
                  bullets={planBulletsForLanguage("free", language)}
                  activeLabel={t("plan.activeBadge")}
                  redirectLabel={t("plan.redirecting")}
                />

                <PlanCard
                  title={t("plan.proTitle")}
                  price={t("plan.proPrice")}
                  icon={<Zap size={16} />}
                  active={current === "pro"}
                  isCurrentPlan={current === "pro"}
                  bullets={planBulletsForLanguage("pro", language)}
                  actionLabel={proActionLabel}
                  disabled={proDisabled}
                  loading={upgrading === "pro"}
                  onAction={proOnAction}
                  activeLabel={t("plan.activeBadge")}
                  redirectLabel={t("plan.redirecting")}
                />

                <PlanCard
                  title={t("plan.ultraTitle")}
                  price={t("plan.ultraPrice")}
                  icon={<Crown size={16} />}
                  active={current === "ultra"}
                  isCurrentPlan={current === "ultra"}
                  bullets={planBulletsForLanguage("ultra", language)}
                  actionLabel={ultraActionLabel}
                  disabled={
                    (current === "ultra" && hasLiveSubscription) || upgrading === "ultra"
                  }
                  loading={upgrading === "ultra"}
                  onAction={
                    (current === "ultra" && hasLiveSubscription) || upgrading === "ultra"
                      ? undefined
                      : () => void upgrade("ultra")
                  }
                  activeLabel={t("plan.activeBadge")}
                  redirectLabel={t("plan.redirecting")}
                  highlight
                />
              </div>
            </div>

            <div className="mt-4 shrink-0 space-y-2">
              {!isGuest ? (
                <button
                  type="button"
                  onClick={() => void syncPlanFromStripe()}
                  disabled={loading}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm transition hover:bg-white/10 disabled:opacity-50"
                >
                  {loading ? t("plan.loading") : "Plan von Stripe synchronisieren"}
                </button>
              ) : null}
              {canManageBilling ? (
                <button
                  type="button"
                  onClick={() => void openBillingPortal()}
                  disabled={openingPortal}
                  className="w-full rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  {openingPortal ? t("plan.openingPortal") : t("plan.manageBilling")}
                </button>
              ) : null}
              <p className="text-center text-xs text-muted">{t("plan.stripeNote")}</p>
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
        className={`mt-2 flex w-full shrink-0 flex-col gap-0.5 rounded-xl border px-2 py-2 text-left transition sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-3 sm:py-2.5 lg:text-sm ${
          isPaidPlan
            ? "border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/15"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
      >
        <span
          className={`truncate text-[11px] font-medium sm:text-sm ${
            isPaidPlan ? "text-emerald-200" : ""
          }`}
        >
          {loading ? t("plan.loading") : isPaidPlan ? `${badgeLabel} · ${t("plan.activeBadge")}` : badgeLabel}
        </span>
        <span className="truncate text-[10px] text-muted sm:text-xs">
          {loading
            ? "…"
            : isGuest
              ? t("plan.guestSignupHint")
              : !usage?.createLimit
                ? "…"
                : getPlanUsageLabel(
                    language,
                    usage.createRemaining ?? null,
                    usage.createLimit ?? null,
                    usage.uploadRemaining ?? null,
                    usage.uploadLimit ?? null
                  )}
        </span>
      </button>

      {mounted ? createPortal(modal, document.body) : null}
      <AuthRequiredModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        description={t("plan.authRequired")}
      />
    </>
  );
}

function PlanCard({
  title,
  price,
  icon,
  bullets,
  active,
  isCurrentPlan,
  actionLabel,
  disabled,
  loading,
  onAction,
  highlight,
  activeLabel = "Active",
  redirectLabel = "Redirecting..."
}: {
  title: string;
  price: string;
  icon: React.ReactNode;
  bullets: string[];
  active?: boolean;
  isCurrentPlan?: boolean;
  actionLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onAction?: () => void;
  highlight?: boolean;
  activeLabel?: string;
  redirectLabel?: string;
}) {
  const showActiveBadge = Boolean(
    isCurrentPlan && (actionLabel === activeLabel || !actionLabel)
  );

  return (
    <div
      className={`flex h-full flex-col rounded-xl border p-3 sm:p-4 ${
        highlight ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5"
      } ${isCurrentPlan ? "ring-1 ring-emerald-400/40" : active ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="flex min-w-0 items-center gap-2 font-medium">
          {icon}
          <span className="text-base">{title}</span>
          {isCurrentPlan ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
              {activeLabel}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-medium sm:text-right">{price}</span>
      </div>
      <ul className="mb-3 flex-1 space-y-1.5 text-xs leading-relaxed text-muted sm:text-sm">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="shrink-0 text-primary/80">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled || loading || !onAction}
          className={`mt-auto w-full rounded-lg px-3 py-2 text-sm transition disabled:opacity-50 ${
            showActiveBadge
              ? "bg-emerald-500/20 font-medium text-emerald-100 ring-1 ring-emerald-400/35"
              : "bg-white/10 hover:bg-white/15"
          }`}
        >
          {loading ? redirectLabel : actionLabel}
        </button>
      ) : isCurrentPlan ? (
        <p className="mt-auto text-xs font-medium text-emerald-200">{activeLabel}</p>
      ) : null}
    </div>
  );
}

export type { PlanState };
