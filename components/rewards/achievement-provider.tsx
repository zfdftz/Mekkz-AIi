"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Unlock = { id: string; name: string; icon: string; type: "badge" | "title" };

type AchievementContextValue = {
  notifyUnlock: (unlock: Unlock) => void;
};

const AchievementContext = createContext<AchievementContextValue | null>(null);

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Unlock[]>([]);
  const knownBadges = useRef<Set<string>>(new Set());
  const started = useRef(false);

  const notifyUnlock = useCallback((unlock: Unlock) => {
    setQueue((prev) => [...prev, unlock]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/rewards/sync-check");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { newUnlocks?: Unlock[] };
        const unlocks = data.newUnlocks ?? [];

        if (!started.current) {
          started.current = true;
          unlocks.forEach((u) => knownBadges.current.add(u.id));
          return;
        }

        for (const u of unlocks) {
          if (!knownBadges.current.has(u.id)) {
            knownBadges.current.add(u.id);
            setQueue((prev) => [...prev, u]);
          }
        }
      } catch {
        /* ignore */
      }
    }

    void poll();
    const id = setInterval(() => void poll(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((prev) => prev.slice(1)), 5000);
    return () => clearTimeout(t);
  }, [current]);

  return (
    <AchievementContext.Provider value={{ notifyUnlock }}>
      {children}
      <AnimatePresence>
        {current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="fixed right-4 top-16 z-[200] flex max-w-xs items-start gap-3 rounded-xl border border-primary/40 bg-[#232428]/95 p-4 shadow-2xl backdrop-blur-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl">
              {current.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Trophy size={12} /> Achievement unlocked
              </p>
              <p className="truncate font-semibold">{current.name}</p>
              <p className="text-xs text-muted">
                {current.type === "title" ? "Neuer Titel freigeschaltet" : "Neues Badge erhalten"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQueue((prev) => prev.slice(1))}
              className="shrink-0 rounded p-1 hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const ctx = useContext(AchievementContext);
  return ctx ?? { notifyUnlock: () => {} };
}
