"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Shield, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ErrorBanner, FieldLabel, GhostButton, PrimaryButton, TextInput } from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";

type BadgeDef = { id: string; name: string; description: string };
type TitleDef = { id: string; label: string };
type TargetUser = {
  userId: string;
  username: string | null;
  badges: string[];
  titles: string[];
  isChosen: boolean;
  adminTitles: string[];
};

export function RewardsAdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/community/profile")
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(Boolean(d.profile?.isRewardsAdmin));
        setSelfUserId(d.profile?.userId ?? null);
      });
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
        {open ? (
          <RewardsAdminPanel selfUserId={selfUserId} onClose={() => setOpen(false)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function RewardsAdminPanel({
  selfUserId,
  onClose
}: {
  selfUserId: string | null;
  onClose: () => void;
}) {
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [titles, setTitles] = useState<TitleDef[]>([]);
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState<TargetUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<"badges" | "titles" | "special">("badges");

  useEffect(() => {
    void fetch("/api/rewards/admin")
      .then((r) => readJsonResponse<{ badges?: BadgeDef[]; titles?: TitleDef[] }>(r))
      .then((d) => {
        setBadges(d.badges ?? []);
        setTitles(d.titles ?? []);
      });
  }, []);

  const searchUser = useCallback(async (query?: string) => {
    const q = (query ?? username).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/rewards/admin?username=${encodeURIComponent(q)}`);
      const data = await readJsonResponse<{ user?: TargetUser; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Nutzer nicht gefunden.");
      setTarget(data.user ?? null);
      if (query) setUsername(query);
    } catch (err) {
      setTarget(null);
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  async function adminAction(
    action: "grant-badge" | "revoke-badge" | "grant-title" | "revoke-title" | "set-chosen",
    extra: { badgeId?: string; titleId?: string; chosen?: boolean }
  ) {
    if (!target) return;
    setBusy(`${action}:${extra.badgeId ?? extra.titleId ?? extra.chosen}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/rewards/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.userId, action, ...extra })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Fehler.");
      setSuccess("Aktualisiert.");
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
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-emerald-500/30 bg-card shadow-2xl"
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
            <div className="flex flex-wrap gap-2">
              <TextInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="z. B. mek"
                className="min-w-[140px] flex-1"
                onKeyDown={(e) => e.key === "Enter" && void searchUser()}
              />
              <PrimaryButton loading={loading} onClick={() => void searchUser()}>
                Suchen
              </PrimaryButton>
              {selfUserId ? (
                <GhostButton onClick={() => void searchUser("mek")}>Mir (Mek)</GhostButton>
              ) : null}
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
                {target.isChosen ? (
                  <span className="ml-2 text-xs text-red-400">The Chosen One</span>
                ) : null}
              </p>

              <div className="mb-3 flex gap-1 border-b border-white/10 pb-2">
                {(["badges", "titles", "special"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-3 py-1 text-xs capitalize ${
                      tab === t ? "bg-primary text-white" : "bg-white/10 text-muted"
                    }`}
                  >
                    {t === "special" ? "Special" : t}
                  </button>
                ))}
              </div>

              {tab === "badges" ? (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {badges.map((b) => {
                    const owned = target.badges.includes(b.id);
                    return (
                      <AdminRow
                        key={b.id}
                        title={b.name}
                        subtitle={b.description}
                        owned={owned}
                        busy={busy}
                        grantKey={`grant-badge:${b.id}`}
                        revokeKey={`revoke-badge:${b.id}`}
                        onGrant={() => void adminAction("grant-badge", { badgeId: b.id })}
                        onRevoke={() => void adminAction("revoke-badge", { badgeId: b.id })}
                      />
                    );
                  })}
                </div>
              ) : null}

              {tab === "titles" ? (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {titles.map((t) => {
                    const owned = target.titles.includes(t.id);
                    return (
                      <AdminRow
                        key={t.id}
                        title={t.label}
                        subtitle={t.id}
                        owned={owned}
                        busy={busy}
                        grantKey={`grant-title:${t.id}`}
                        revokeKey={`revoke-title:${t.id}`}
                        onGrant={() => void adminAction("grant-title", { titleId: t.id })}
                        onRevoke={() => void adminAction("revoke-title", { titleId: t.id })}
                      />
                    );
                  })}
                </div>
              ) : null}

              {tab === "special" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="mb-2 text-sm font-semibold text-red-200">The Chosen One</p>
                    <p className="mb-3 text-xs text-muted">
                      Roter Haken neben Verified — nur von dir vergeben.
                    </p>
                    {target.isChosen ? (
                      <GhostButton
                        className="text-red-300"
                        disabled={busy !== null}
                        onClick={() => void adminAction("set-chosen", { chosen: false })}
                      >
                        {busy === "set-chosen:false" ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          "Entfernen"
                        )}
                      </GhostButton>
                    ) : (
                      <PrimaryButton
                        disabled={busy !== null}
                        onClick={() => void adminAction("set-chosen", { chosen: true })}
                      >
                        {busy === "set-chosen:true" ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          "The Chosen One vergeben"
                        )}
                      </PrimaryButton>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AdminRow({
  title,
  subtitle,
  owned,
  busy,
  grantKey,
  revokeKey,
  onGrant,
  onRevoke
}: {
  title: string;
  subtitle: string;
  owned: boolean;
  busy: string | null;
  grantKey: string;
  revokeKey: string;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-[10px] text-muted">{subtitle}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {!owned ? (
          <GhostButton className="text-xs" disabled={busy !== null} onClick={onGrant}>
            {busy === grantKey ? <Loader2 className="animate-spin" size={14} /> : "+"}
          </GhostButton>
        ) : (
          <GhostButton className="text-xs text-red-300" disabled={busy !== null} onClick={onRevoke}>
            {busy === revokeKey ? <Loader2 className="animate-spin" size={14} /> : "−"}
          </GhostButton>
        )}
      </div>
    </div>
  );
}
