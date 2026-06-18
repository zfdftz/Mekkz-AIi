"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { generateWatcherMessage, toWatcherLocale } from "@/lib/watcher/generator";
import {
  clearWatcherDismissIfExpired,
  dismissWatcher,
  isWatcherDismissed,
  msUntilWatcherReturns
} from "@/lib/watcher/dismiss";
import { playWatcherSound } from "@/lib/watcher/sounds";
import type { WatcherContext } from "@/lib/watcher/types";

const CLICK_COOLDOWN_MS = 2500;
const BUBBLE_VISIBLE_MS = 7000;
const UNPROMPTED_COOLDOWN_MS = 10 * 60 * 1000;
const UNPROMPTED_CHANCE = 0.0035;

type WatcherEyeProps = {
  context: WatcherContext;
  activitySignal?: number;
};

export function WatcherEye({ context, activitySignal = 0 }: WatcherEyeProps) {
  const { language, t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const clickSalt = useRef(0);
  const lastClickAt = useRef(0);
  const lastUnpromptedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reopenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncDismissState = useCallback(() => {
    setDismissed(clearWatcherDismissIfExpired());
  }, []);

  useEffect(() => {
    syncDismissState();
  }, [syncDismissState]);

  useEffect(() => {
    if (reopenTimer.current) {
      clearTimeout(reopenTimer.current);
      reopenTimer.current = null;
    }
    if (!dismissed) return;

    const ms = msUntilWatcherReturns();
    if (ms == null || ms <= 0) {
      syncDismissState();
      return;
    }

    reopenTimer.current = setTimeout(() => {
      syncDismissState();
      setVisible(false);
      setMessage("");
    }, ms + 50);

    return () => {
      if (reopenTimer.current) clearTimeout(reopenTimer.current);
    };
  }, [dismissed, syncDismissState]);

  const showMessage = useCallback(
    (ctx: WatcherContext, salt: number, withSound = true) => {
      const locale = toWatcherLocale(language);
      const next = generateWatcherMessage(locale, ctx, salt);
      setMessage(next);
      setVisible(true);
      if (withSound) playWatcherSound({ volume: 0.2 });

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), BUBBLE_VISIBLE_MS);
    },
    [language]
  );

  const onEyeClick = useCallback(() => {
    if (dismissed) return;
    const now = Date.now();
    if (now - lastClickAt.current < CLICK_COOLDOWN_MS) return;
    lastClickAt.current = now;
    clickSalt.current += 1;
    showMessage(context, clickSalt.current);
  }, [context, dismissed, showMessage]);

  const onDismiss = useCallback(() => {
    dismissWatcher();
    setDismissed(true);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (activitySignal <= 0 || dismissed || isWatcherDismissed()) return;
    const now = Date.now();
    if (now - lastUnpromptedAt.current < UNPROMPTED_COOLDOWN_MS) return;
    if (Math.random() > UNPROMPTED_CHANCE) return;

    lastUnpromptedAt.current = now;
    clickSalt.current += 97;
    showMessage(context, clickSalt.current, false);
  }, [activitySignal, context, dismissed, showMessage]);

  if (dismissed) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-[35] flex flex-col items-start gap-1.5 p-0">
      <AnimatePresence>
        {visible ? (
          <motion.div
            key={message}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative max-w-[min(18rem,calc(100vw-5rem))] rounded-2xl border border-violet-500/25 bg-black/80 px-3 py-2.5 pr-8 text-xs leading-relaxed text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.18)] backdrop-blur-md sm:max-w-xs sm:text-sm"
          >
            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-2 top-2 rounded-md p-0.5 text-violet-300/60 transition hover:bg-white/10 hover:text-violet-100"
              aria-label={t("watcher.dismissAria")}
              title={t("watcher.dismissAria")}
            >
              <X size={12} />
            </button>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300/70">
              {t("watcher.title")}
            </p>
            <p className="text-violet-50/95">{message}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={onEyeClick}
        aria-label={t("watcher.openAria")}
        title={t("watcher.openAria")}
        className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[10px] leading-none text-white/50 shadow-[0_0_8px_rgba(139,92,246,0.1)] backdrop-blur-sm transition hover:border-violet-400/30 hover:bg-black/55 hover:text-violet-200/85 hover:shadow-[0_0_12px_rgba(139,92,246,0.18)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400/40 sm:h-6 sm:w-6 sm:text-[11px]"
      >
        <span aria-hidden className="select-none leading-none scale-90">
          👁️
        </span>
      </button>
    </div>
  );
}
