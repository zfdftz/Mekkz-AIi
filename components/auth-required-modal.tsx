"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { Route } from "next";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type AuthRequiredModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  returnTo?: string;
};

export function AuthRequiredModal({
  open,
  onClose,
  title = "Anmeldung erforderlich",
  description = "Für Bilder, Uploads und Pro/Ultra musst du dich zuerst anmelden oder registrieren.",
  returnTo
}: AuthRequiredModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted) return null;

  const registerHref = (
    returnTo
      ? `/auth/register?next=${encodeURIComponent(returnTo)}`
      : "/auth/register"
  ) as Route;
  const loginHref = (
    returnTo ? `/auth/login?next=${encodeURIComponent(returnTo)}` : "/auth/login"
  ) as Route;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[hsl(var(--card))] p-5 shadow-2xl"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Schließen"
                className="rounded-lg bg-white/10 p-2 transition hover:bg-white/15"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href={registerHref}
                className="btn-primary flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium"
                onClick={onClose}
              >
                Registrieren
              </Link>
              <Link
                href={loginHref}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium transition hover:bg-white/10"
                onClick={onClose}
              >
                Login
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
