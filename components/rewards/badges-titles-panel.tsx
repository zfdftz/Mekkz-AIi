"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, RefreshCw, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GhostButton } from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";
import { TITLES } from "@/lib/rewards/catalog";

type QuestRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: string;
  secret: boolean;
  unlocked: boolean;
  titleId: string | null;
};

type TitleRow = { id: string; label: string; unlocked: boolean };

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "profile", label: "Profil" },
  { id: "chat", label: "Chat" },
  { id: "creation", label: "Creation" },
  { id: "community", label: "Community" },
  { id: "season", label: "Season" },
  { id: "special", label: "Special" },
  { id: "secret", label: "Secret" }
];

function BadgesTitlesContent() {
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"badges" | "titles">("badges");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rewards/quests");
      const data = await readJsonResponse<{ quests?: QuestRow[]; titles?: TitleRow[] }>(res);
      if (res.ok) {
        setQuests(data.quests ?? []);
        setTitles(data.titles ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return quests;
    return quests.filter((q) => q.category === filter);
  }, [quests, filter]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setView("badges")}
          className={`season-tab rounded-lg px-3 py-1.5 text-xs ${view === "badges" ? "season-tab-active" : "bg-white/5"}`}
        >
          Badges
        </button>
        <button
          type="button"
          onClick={() => setView("titles")}
          className={`season-tab rounded-lg px-3 py-1.5 text-xs ${view === "titles" ? "season-tab-active" : "bg-white/5"}`}
        >
          Titles
        </button>
      </div>

      {view === "badges" ? (
        <>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] ${
                  filter === c.id ? "bg-primary text-white" : "bg-white/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="max-h-[min(50dvh,420px)] space-y-2 overflow-y-auto overscroll-contain pr-1">
            {filtered.map((q) => (
              <div
                key={q.id}
                className={`rounded-xl border px-3 py-2.5 ${
                  q.unlocked
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/10 bg-black/20 opacity-90"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{q.unlocked || !q.secret ? q.icon : "❓"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {q.unlocked || !q.secret ? q.name : "Secret Badge"}
                      {q.unlocked ? (
                        <span className="ml-2 text-[10px] text-emerald-300">✓</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted">
                      {q.unlocked || !q.secret ? q.description : "??? — Entdecke die Bedingung selbst."}
                    </p>
                    <p className="mt-1 text-[10px] text-primary">
                      Requirements: {q.requirement}
                    </p>
                  </div>
                  {!q.unlocked ? <Lock size={14} className="shrink-0 text-muted" /> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="max-h-[min(50dvh,420px)] space-y-2 overflow-y-auto overscroll-contain">
          {titles.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                t.unlocked ? "border-primary/30 bg-primary/5" : "border-white/10 bg-black/20"
              }`}
            >
              <span className="text-sm">{TITLES[t.id]?.label ?? t.label}</span>
              {t.unlocked ? (
                <span className="text-[10px] text-emerald-300">Freigeschaltet</span>
              ) : (
                <span className="text-[10px] text-muted">Gesperrt</span>
              )}
            </div>
          ))}
        </div>
      )}

      <GhostButton className="w-full" onClick={() => void load()}>
        <RefreshCw size={14} className="mr-1 inline" /> Quests aktualisieren
      </GhostButton>
    </div>
  );
}

export function BadgesTitlesPanel({ onClose }: { onClose?: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        onClick={() => onClose?.()}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex max-h-[min(90dvh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Trophy size={18} className="text-primary" /> Badges & Titles
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <BadgesTitlesContent />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
