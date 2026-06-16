"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { VoiceGender } from "@/lib/voice/speech-voices";

type VoiceModeOverlayProps = {
  open: boolean;
  onClose: () => void;
  listening: boolean;
  speaking: boolean;
  processing: boolean;
  interimText: string;
  micError: string | null;
  voiceGender: VoiceGender;
  onStopSpeaking: () => void;
};

function orbColors(state: "idle" | "listening" | "speaking" | "thinking") {
  if (state === "speaking") {
    return "from-white via-slate-100 to-zinc-300";
  }
  if (state === "listening") {
    return "from-sky-200 via-cyan-100 to-white";
  }
  if (state === "thinking") {
    return "from-violet-200 via-indigo-100 to-white";
  }
  return "from-zinc-200 via-white to-zinc-300";
}

export function VoiceModeOverlay({
  open,
  onClose,
  listening,
  speaking,
  processing,
  interimText,
  micError,
  voiceGender,
  onStopSpeaking
}: VoiceModeOverlayProps) {
  const { t } = useLanguage();
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

  const state: "idle" | "listening" | "speaking" | "thinking" = speaking
    ? "speaking"
    : processing
      ? "thinking"
      : listening
        ? "listening"
        : "idle";

  const statusLabel =
    micError ??
    (speaking
      ? t("voice.speaking")
      : processing
        ? t("voice.thinking")
        : listening
          ? t("voice.listening")
          : t("voice.tapToSpeak"));

  const overlay = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a] text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <header className="flex items-center justify-between px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label={t("voice.close")}
            >
              <X size={22} />
            </button>
            <p className="text-sm font-medium text-white/70">{t("voice.mode")}</p>
            <div className="w-10" />
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
              {[0, 1, 2].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 rounded-full border border-white/10"
                  animate={{
                    scale: listening || speaking || processing ? [1, 1.18 + ring * 0.08, 1] : 1,
                    opacity: listening || speaking || processing ? [0.35, 0.08, 0.35] : 0.15
                  }}
                  transition={{
                    duration: 2.2 + ring * 0.35,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: ring * 0.25
                  }}
                />
              ))}

              <motion.button
                type="button"
                onClick={speaking ? onStopSpeaking : undefined}
                className={`relative z-10 h-36 w-36 rounded-full bg-gradient-to-br shadow-[0_0_80px_rgba(255,255,255,0.25)] sm:h-40 sm:w-40 ${orbColors(state)} ${
                  speaking ? "cursor-pointer" : "cursor-default"
                }`}
                animate={{
                  scale:
                    state === "speaking"
                      ? [1, 1.06, 0.98, 1.04, 1]
                      : state === "listening"
                        ? [1, 1.05, 1]
                        : state === "thinking"
                          ? [1, 1.03, 1]
                          : 1
                }}
                transition={{
                  duration: state === "speaking" ? 1.1 : 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                aria-label={speaking ? t("voice.stop") : t("voice.mode")}
              >
                <motion.div
                  className="absolute inset-[18%] rounded-full bg-white/35 blur-md"
                  animate={{ opacity: listening || speaking ? [0.45, 0.75, 0.45] : 0.35 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.button>
            </div>

            <p className="mt-8 text-center text-sm text-white/75">{statusLabel}</p>
            <p className="mt-2 text-center text-xs text-white/40">
              {voiceGender === "male" ? t("voice.genderMale") : t("voice.genderFemale")}
            </p>
          </div>

          <footer className="min-h-[120px] px-6 pb-8 pt-2">
            {interimText ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-2xl text-center text-base leading-7 text-white/85"
              >
                {interimText}
              </motion.p>
            ) : (
              <p className="text-center text-sm text-white/35">{t("voice.overlayHint")}</p>
            )}
          </footer>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
