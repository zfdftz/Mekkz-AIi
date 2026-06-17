"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Shield, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ErrorBanner,
  FieldLabel,
  GhostButton,
  PrimaryButton,
  TextArea,
  TextInput
} from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";

type BadgeDef = { id: string; name: string; description: string };
type TitleDef = { id: string; label: string };
type SearchHit = { userId: string; username: string | null };
type TargetUser = {
  userId: string;
  username: string | null;
  badges: string[];
  titles: string[];
  isChosen: boolean;
  isVerified: boolean;
  isCreator: boolean;
  isUltraCreator: boolean;
  isFounder: boolean;
  adminTitles: string[];
  moderationWarning: string | null;
  bannedUntil: string | null;
};

type AdminAction =
  | "grant-badge"
  | "revoke-badge"
  | "grant-title"
  | "revoke-title"
  | "set-chosen"
  | "set-identity"
  | "grant-all"
  | "send-warning"
  | "ban"
  | "unban"
  | "delete-account";

export function RewardsAdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [selfUsername, setSelfUsername] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/community/profile")
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(Boolean(d.profile?.isRewardsAdmin));
        setSelfUserId(d.profile?.userId ?? null);
        setSelfUsername(d.profile?.username ?? null);
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
          <RewardsAdminPanel
            selfUserId={selfUserId}
            selfUsername={selfUsername}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function RewardsAdminPanel({
  selfUserId,
  selfUsername,
  onClose
}: {
  selfUserId: string | null;
  selfUsername: string | null;
  onClose: () => void;
}) {
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [titles, setTitles] = useState<TitleDef[]>([]);
  const [username, setUsername] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [target, setTarget] = useState<TargetUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<"badges" | "titles" | "identity" | "moderation">("badges");
  const [warningText, setWarningText] = useState("");
  const [banDays, setBanDays] = useState(7);

  useEffect(() => {
    void fetch("/api/rewards/admin")
      .then((r) => readJsonResponse<{ badges?: BadgeDef[]; titles?: TitleDef[] }>(r))
      .then((d) => {
        setBadges(d.badges ?? []);
        setTitles(d.titles ?? []);
      });
  }, []);

  const loadUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSearchHits([]);
    try {
      const res = await fetch(`/api/rewards/admin?userId=${encodeURIComponent(userId)}`);
      const data = await readJsonResponse<{ user?: TargetUser; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Nutzer nicht gefunden.");
      setTarget(data.user ?? null);
    } catch (err) {
      setTarget(null);
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchUser = useCallback(async (query?: string) => {
    const q = (query ?? username).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSearchHits([]);
    try {
      const res = await fetch(`/api/rewards/admin?username=${encodeURIComponent(q)}`);
      const data = await readJsonResponse<{
        user?: TargetUser;
        users?: SearchHit[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Nutzer nicht gefunden.");
      if (data.users?.length) {
        setSearchHits(data.users);
        setTarget(null);
        if (query) setUsername(query);
        return;
      }
      setTarget(data.user ?? null);
      if (query) setUsername(query);
    } catch (err) {
      setTarget(null);
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  async function adminAction(action: AdminAction, extra: Record<string, unknown> = {}) {
    if (!target) return;
    setBusy(`${action}:${JSON.stringify(extra)}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/rewards/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.userId, action, ...extra })
      });
      const data = await readJsonResponse<{ error?: string; deleted?: boolean }>(res);
      if (!res.ok) throw new Error(data.error || "Fehler.");
      if (data.deleted) {
        setSuccess("Account gelöscht.");
        setTarget(null);
        return;
      }
      setSuccess("Aktualisiert.");
      await loadUser(target.userId);
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
                placeholder="Teilweise suchen, z. B. mek"
                className="min-w-[140px] flex-1"
                onKeyDown={(e) => e.key === "Enter" && void searchUser()}
              />
              <PrimaryButton loading={loading} onClick={() => void searchUser()}>
                Suchen
              </PrimaryButton>
              {selfUserId && selfUsername ? (
                <GhostButton onClick={() => void searchUser(selfUsername)}>Mir</GhostButton>
              ) : null}
            </div>
          </div>

          {searchHits.length > 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <p className="mb-2 px-1 text-xs text-muted">{searchHits.length} Treffer — auswählen:</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {searchHits.map((hit) => (
                  <button
                    key={hit.userId}
                    type="button"
                    onClick={() => void loadUser(hit.userId)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                  >
                    @{hit.username ?? hit.userId.slice(0, 8)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <ErrorBanner message={error} />
          {success ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {success}
            </p>
          ) : null}

          {target ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="mb-1 text-sm">
                <span className="text-muted">Ziel:</span>{" "}
                <strong>@{target.username ?? "user"}</strong>
              </p>
              <div className="mb-3 flex flex-wrap gap-1 text-[10px]">
                {target.isVerified ? (
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-200">Verified</span>
                ) : null}
                {target.isCreator ? (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-200">Creator</span>
                ) : null}
                {target.isUltraCreator ? (
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-indigo-200">Ultra</span>
                ) : null}
                {target.isChosen ? (
                  <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-200">Chosen</span>
                ) : null}
                {target.isFounder ? (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-200">Founder</span>
                ) : null}
                {target.bannedUntil ? (
                  <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-200">
                    Gebannt bis {new Date(target.bannedUntil).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
              {target.moderationWarning ? (
                <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
                  Warnung: {target.moderationWarning}
                </p>
              ) : null}

              <div className="mb-3 flex flex-wrap gap-1 border-b border-white/10 pb-2">
                {(["badges", "titles", "identity", "moderation"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-3 py-1 text-xs capitalize ${
                      tab === t ? "bg-primary text-white" : "bg-white/10 text-muted"
                    }`}
                  >
                    {t === "identity" ? "Identity" : t === "moderation" ? "Moderation" : t}
                  </button>
                ))}
              </div>

              {tab === "badges" ? (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  <PrimaryButton
                    className="mb-2 w-full text-xs"
                    disabled={busy !== null}
                    onClick={() => void adminAction("grant-all")}
                  >
                    {busy?.startsWith("grant-all") ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      "Alles freischalten (Badges, Titel, Hintergründe)"
                    )}
                  </PrimaryButton>
                  {badges.map((b) => {
                    const owned = target.badges.includes(b.id);
                    return (
                      <AdminRow
                        key={b.id}
                        title={b.name}
                        subtitle={b.description}
                        owned={owned}
                        busy={busy}
                        grantKey={`grant-badge:${JSON.stringify({ badgeId: b.id })}`}
                        revokeKey={`revoke-badge:${JSON.stringify({ badgeId: b.id })}`}
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
                        grantKey={`grant-title:${JSON.stringify({ titleId: t.id })}`}
                        revokeKey={`revoke-title:${JSON.stringify({ titleId: t.id })}`}
                        onGrant={() => void adminAction("grant-title", { titleId: t.id })}
                        onRevoke={() => void adminAction("revoke-title", { titleId: t.id })}
                      />
                    );
                  })}
                </div>
              ) : null}

              {tab === "identity" ? (
                <div className="space-y-3">
                  <IdentityToggle
                    label="Verified"
                    active={target.isVerified}
                    busy={busy !== null}
                    onEnable={() => void adminAction("set-identity", { isVerified: true })}
                    onDisable={() => void adminAction("set-identity", { isVerified: false })}
                  />
                  <IdentityToggle
                    label="Mekkz AI Creator"
                    active={target.isCreator}
                    busy={busy !== null}
                    onEnable={() => void adminAction("set-identity", { isCreator: true })}
                    onDisable={() => void adminAction("set-identity", { isCreator: false })}
                  />
                  <IdentityToggle
                    label="Ultra Creator"
                    active={target.isUltraCreator}
                    busy={busy !== null}
                    onEnable={() => void adminAction("set-identity", { isUltraCreator: true })}
                    onDisable={() => void adminAction("set-identity", { isUltraCreator: false })}
                  />
                  <IdentityToggle
                    label="The Chosen One"
                    active={target.isChosen}
                    busy={busy !== null}
                    onEnable={() => void adminAction("set-identity", { isChosen: true })}
                    onDisable={() => void adminAction("set-identity", { isChosen: false })}
                  />
                  <IdentityToggle
                    label="Founder"
                    active={target.isFounder}
                    busy={busy !== null}
                    onEnable={() => void adminAction("grant-badge", { badgeId: "founder" })}
                    onDisable={() => void adminAction("revoke-badge", { badgeId: "founder" })}
                  />
                </div>
              ) : null}

              {tab === "moderation" ? (
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Warnung senden</FieldLabel>
                    <TextArea
                      rows={2}
                      value={warningText}
                      onChange={(e) => setWarningText(e.target.value)}
                      placeholder="Grund der Verwarnung…"
                    />
                    <PrimaryButton
                      className="mt-2"
                      disabled={busy !== null || !warningText.trim()}
                      onClick={() =>
                        void adminAction("send-warning", { warningMessage: warningText.trim() })
                      }
                    >
                      Warnung senden
                    </PrimaryButton>
                  </div>
                  <div>
                    <FieldLabel>Timeout / Ban (Tage)</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      <TextInput
                        type="number"
                        min={1}
                        max={365}
                        value={banDays}
                        onChange={(e) => setBanDays(Number(e.target.value) || 7)}
                        className="w-24"
                      />
                      {[1, 7, 30].map((d) => (
                        <GhostButton key={d} onClick={() => setBanDays(d)}>
                          {d}d
                        </GhostButton>
                      ))}
                      <PrimaryButton
                        disabled={busy !== null}
                        onClick={() => void adminAction("ban", { banDays })}
                      >
                        Bannen
                      </PrimaryButton>
                      {target.bannedUntil ? (
                        <GhostButton
                          className="text-emerald-300"
                          disabled={busy !== null}
                          onClick={() => void adminAction("unban")}
                        >
                          Entbannen
                        </GhostButton>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                    <p className="mb-2 text-sm font-semibold text-red-200">Account löschen</p>
                    <GhostButton
                      className="text-red-300"
                      disabled={busy !== null}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Account @${target.username ?? "user"} unwiderruflich löschen?`
                          )
                        ) {
                          void adminAction("delete-account");
                        }
                      }}
                    >
                      Account löschen
                    </GhostButton>
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

function IdentityToggle({
  label,
  active,
  busy,
  onEnable,
  onDisable
}: {
  label: string;
  active: boolean;
  busy: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-sm">{label}</span>
      {active ? (
        <GhostButton className="text-red-300" disabled={busy} onClick={onDisable}>
          Entfernen
        </GhostButton>
      ) : (
        <PrimaryButton disabled={busy} onClick={onEnable}>
          Vergeben
        </PrimaryButton>
      )}
    </div>
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
