"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Shield, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ErrorBanner, FieldLabel, GhostButton, PrimaryButton, TextInput } from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";

type BadgeDef = { id: string; name: string; description: string };
type TargetUser = {
  userId: string;
  username: string | null;
  badges: string[];
};

export function RewardsAdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/community/profile")
      .then((r) => r.json())
      .then((d) => setIsAdmin(Boolean(d.profile?.isRewardsAdmin)));
  }, []);

  if (!isAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Rewards Admin"
        aria-label="Rewards Admin"
        className="fixed right-4 top-4 z-[90] flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow-lg backdrop-blur-md transition hover:bg-emerald-500/25"
      >
        <Shield size={18} />
      </button>
      <AnimatePresence>
        {open ? <RewardsAdminPanel onClose={() => setOpen(false)} /> : null}
      </AnimatePresence>
    </>
  );
}

function RewardsAdminPanel({ onClose }: { onClose: () => void }) {
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState<TargetUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/rewards/admin")
      .then((r) => readJsonResponse<{ badges?: BadgeDef[] }>(r))
      .then((d) => setBadges(d.badges ?? []));
  }, []);

  const searchUser = useCallback(async () => {
    const q = username.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/rewards/admin?username=${encodeURIComponent(q)}`);
      const data = await readJsonResponse<{ user?: TargetUser; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Nutzer nicht gefunden.");
      setTarget(data.user ?? null);
    } catch (err) {
      setTarget(null);
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  async function mutateBadge(badgeId: string, action: "grant" | "revoke") {
    if (!target) return;
    setBusy(`${action}:${badgeId}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/rewards/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.userId, badgeId, action })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Fehler.");
      setSuccess(action === "grant" ? "Badge vergeben." : "Badge entfernt.");
      await searchUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-500/30 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="flex items-center gap-2 font-semibold text-emerald-200">
            <Shield size={18} /> Rewards Admin
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <FieldLabel>Benutzername</FieldLabel>
            <div className="flex gap-2">
              <TextInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="z. B. mekkz_user"
                onKeyDown={(e) => e.key === "Enter" && void searchUser()}
              />
              <PrimaryButton loading={loading} onClick={() => void searchUser()}>
                Suchen
              </PrimaryButton>
            </div>
          </div>

          <ErrorBanner message={error} />
          {success ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {success}
            </p>
          ) : null}

          {target ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="mb-3 text-sm">
                <span className="text-muted">Ziel:</span>{" "}
                <strong>@{target.username ?? "user"}</strong>
              </p>
              <p className="mb-2 text-xs font-semibold uppercase text-primary">Badges</p>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {badges.map((b) => {
                  const owned = target.badges.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.name}</p>
                        <p className="truncate text-[10px] text-muted">{b.description}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {!owned ? (
                          <GhostButton
                            className="text-xs"
                            disabled={busy !== null}
                            onClick={() => void mutateBadge(b.id, "grant")}
                          >
                            {busy === `grant:${b.id}` ? <Loader2 className="animate-spin" size={14} /> : "+"}
                          </GhostButton>
                        ) : (
                          <GhostButton
                            className="text-xs text-red-300"
                            disabled={busy !== null}
                            onClick={() => void mutateBadge(b.id, "revoke")}
                          >
                            {busy === `revoke:${b.id}` ? <Loader2 className="animate-spin" size={14} /> : "−"}
                          </GhostButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
