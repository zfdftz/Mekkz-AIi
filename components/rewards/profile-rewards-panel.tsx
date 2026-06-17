"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gift, Heart, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Panel, PrimaryButton } from "@/components/community/shared";
import { BadgeShowcase } from "@/components/rewards/profile-identity";
import { readJsonResponse } from "@/lib/fetch-json";
import { getProfileBackgroundClass, TITLES } from "@/lib/rewards/catalog";
import { toggleShowcaseBadge } from "@/lib/rewards/showcase-rules";

type RewardsState = {
  badges?: { id: string; name: string; description: string; icon: string; grantedAt: string }[];
  showcased?: { id: string; name: string; description: string; icon: string }[];
  inventory?: { id: string; name: string; type: string; rarity: string; previewClass: string; legacy?: boolean }[];
  cosmetics?: {
    bannerUrl: string | null;
    profileFrame: string | null;
    profileBackground: string | null;
    accentColor: string;
    activeTitle: string | null;
    activeTitleLabel: string | null;
    animatedAvatar: boolean;
  };
  unlockedTitles?: string[];
  crate?: { canOpen: boolean; cooldownMs: number; nextOpenAt: string | null };
  season?: { current: { name: string; theme: string }; countdownLabel: string };
  isVerified?: boolean;
  isCreator?: boolean;
};

export type RewardsFormState = {
  showcaseIds: string[];
  profileBackground: string | null;
  accentColor: string;
  activeTitle: string | null;
};

function formatCooldown(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function ProfileRewardsPanel({
  embedded,
  onFormChange
}: {
  embedded?: boolean;
  onFormChange?: (state: RewardsFormState) => void;
}) {
  const [state, setState] = useState<RewardsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [crateOpen, setCrateOpen] = useState(false);
  const [crateReward, setCrateReward] = useState<{ name: string; rarity: string } | null>(null);
  const [showcaseIds, setShowcaseIds] = useState<string[]>([]);
  const [profileBackground, setProfileBackground] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState("#8b5cf6");
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  const emitForm = useCallback(
    (next: Partial<RewardsFormState>) => {
      onFormChange?.({
        showcaseIds,
        profileBackground,
        accentColor,
        activeTitle,
        ...next
      });
    },
    [onFormChange, showcaseIds, profileBackground, accentColor, activeTitle]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rewards");
      const data = await readJsonResponse<RewardsState>(res);
      if (res.ok) {
        setState(data);
        const ids = (data.showcased ?? []).map((b) => b.id);
        const bg = data.cosmetics?.profileBackground ?? null;
        const accent = data.cosmetics?.accentColor ?? "#8b5cf6";
        const title = data.cosmetics?.activeTitle ?? null;
        setShowcaseIds(ids);
        setProfileBackground(bg);
        setAccentColor(accent);
        setActiveTitle(title);
        onFormChange?.({
          showcaseIds: ids,
          profileBackground: bg,
          accentColor: accent,
          activeTitle: title
        });
      }
    } finally {
      setLoading(false);
    }
  }, [onFormChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openCrate() {
    setCrateOpen(true);
    setCrateReward(null);
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open-crate" })
    });
    const data = await readJsonResponse<{ item?: { name: string; rarity: string }; error?: string }>(res);
    if (res.ok && data.item) {
      setCrateReward(data.item);
      await load();
    } else {
      setCrateOpen(false);
    }
  }

  if (loading) {
    const loader = (
      <div className="flex justify-center py-8 text-muted">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
    return embedded ? loader : <Panel>{loader}</Panel>;
  }

  if (!state) return null;

  const bgClass = getProfileBackgroundClass(profileBackground);
  const styleItems = (state.inventory ?? []).filter(
    (i) => i.type === "frame" || i.type === "background"
  );

  const content = (
    <div className="space-y-4">
      {state.season ? (
        <p className="text-center text-[11px] text-muted">
          <Sparkles size={12} className="mr-1 inline text-primary" />
          {state.season.current.name} · {state.season.current.theme}
          <br />
          <span className="opacity-80">{state.season.countdownLabel}</span>
        </p>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Daily Crate</h4>
          <Gift size={16} className="text-primary" />
        </div>
        {state.crate?.canOpen ? (
          <PrimaryButton className="w-full" onClick={() => void openCrate()}>
            Crate öffnen
          </PrimaryButton>
        ) : (
          <p className="text-xs text-muted">
            Nächste Crate in {formatCooldown(state.crate?.cooldownMs ?? 0)}
          </p>
        )}
      </div>

      <div>
        <h4 className="mb-1 text-sm font-semibold">Badge Showcase</h4>
        <p className="mb-2 text-[10px] text-muted">Pro Kategorie nur ein Badge (z. B. nur ein Chat-Badge).</p>
        <BadgeShowcase badges={state.showcased ?? []} />
        <div className="mt-2 flex flex-wrap gap-1">
          {(state.badges ?? []).map((b) => {
            const active = showcaseIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                title={`${b.name} — ${b.description}`}
                onClick={() => {
                  const next = toggleShowcaseBadge(showcaseIds, b.id);
                  setShowcaseIds(next);
                  emitForm({ showcaseIds: next });
                }}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  active ? "border-primary bg-primary/20" : "border-white/10 bg-white/5"
                }`}
              >
                {b.icon} {b.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Profil-Hintergrund</h4>
        <div
          className={`mb-3 h-24 rounded-xl border border-white/10 bg-cover bg-center ${bgClass}`}
        />
        <label className="mb-2 block text-xs text-muted">Akzentfarbe</label>
        <input
          type="color"
          value={accentColor}
          onChange={(e) => {
            setAccentColor(e.target.value);
            emitForm({ accentColor: e.target.value });
          }}
          className="mb-3 h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent"
        />
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => {
              setProfileBackground(null);
              emitForm({ profileBackground: null });
            }}
            className={`rounded-lg px-2 py-1 text-[10px] ${
              !profileBackground ? "bg-primary text-white" : "bg-white/10"
            }`}
          >
            Standard
          </button>
          {styleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setProfileBackground(item.id);
                emitForm({ profileBackground: item.id });
              }}
              className={`rounded-lg px-2 py-1 text-[10px] ${
                profileBackground === item.id ? "bg-primary text-white" : "bg-white/10"
              }`}
            >
              {item.name} {item.legacy ? "★" : ""}
            </button>
          ))}
        </div>
      </div>

      {(state.unlockedTitles ?? []).length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Titel</h4>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTitle(null);
                emitForm({ activeTitle: null });
              }}
              className={`rounded-lg px-2 py-1 text-xs ${!activeTitle ? "bg-primary text-white" : "bg-white/10"}`}
            >
              Kein Titel
            </button>
            {(state.unlockedTitles ?? []).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTitle(id);
                  emitForm({ activeTitle: id });
                }}
                className={`rounded-lg px-2 py-1 text-xs ${
                  activeTitle === id ? "bg-primary text-white" : "bg-white/10"
                }`}
              >
                {TITLES[id]?.label ?? id}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {embedded ? content : <Panel className="space-y-4">{content}</Panel>}

      <AnimatePresence>
        {crateOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setCrateOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`rounded-2xl border p-8 text-center shadow-2xl ${
                crateReward
                  ? `reward-rarity-${crateReward.rarity} border-white/20 bg-card`
                  : "border-primary/40 bg-card"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {!crateReward ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="mx-auto mb-4 text-5xl"
                >
                  🎁
                </motion.div>
              ) : (
                <>
                  <p className="mb-2 text-xs uppercase text-primary">{crateReward.rarity}</p>
                  <p className="text-lg font-bold">{crateReward.name}</p>
                  <button
                    type="button"
                    className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm"
                    onClick={() => setCrateOpen(false)}
                  >
                    Nice!
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function ProfileLikesStat({ totalLikes }: { totalLikes: number }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Heart size={14} className="fill-red-500/80 text-red-400" />
      <span className="font-semibold">{totalLikes.toLocaleString("de-DE")}</span>
      <span className="text-muted">Likes gesamt</span>
    </div>
  );
}
