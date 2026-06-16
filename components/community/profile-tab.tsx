"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AVATAR_MAX_BYTES,
  USERNAME_MIN_LENGTH
} from "@/lib/community/profile-rules";
import {
  ErrorBanner,
  FieldLabel,
  LoadingState,
  Panel,
  PrimaryButton,
  TextArea,
  TextInput
} from "@/components/community/shared";
import { FollowerStats, FollowersPanel, formatCount } from "@/components/community/followers-panel";
import { readJsonResponse } from "@/lib/fetch-json";
import type { UserProfile } from "@/lib/community/types";

const AVATAR_MAX_MB = Math.round(AVATAR_MAX_BYTES / (1024 * 1024));

export function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFollowList, setShowFollowList] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");

  const usernameLocked = profile?.canChangeUsername === false;
  const usernameHint = useMemo(() => {
    if (usernameLocked && profile?.nextUsernameChangeAt) {
      return `Nächste Änderung ab ${new Date(profile.nextUsernameChangeAt).toLocaleDateString("de-DE")} (30-Tage-Limit).`;
    }
    return `Mindestens ${USERNAME_MIN_LENGTH} Zeichen. Jeder Name ist einmalig.`;
  }, [usernameLocked, profile?.nextUsernameChangeAt]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/community/profile");
      const data = await readJsonResponse<{ profile?: UserProfile; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Profil konnte nicht geladen werden.");
      setProfile(data.profile ?? null);
      setUsername(data.profile?.username ?? "");
      setBio(data.profile?.bio ?? "");
      setAvatarUrl(data.profile?.avatarUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: {
        username?: string;
        bio: string;
        avatarUrl: string | null;
      } = {
        bio,
        avatarUrl: avatarUrl.trim() || null
      };

      if (!usernameLocked) {
        payload.username = username.trim();
      }

      const res = await fetch("/api/community/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readJsonResponse<{ profile?: UserProfile; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen.");
      setProfile(data.profile ?? null);
      setUsername(data.profile?.username ?? username);
      setSuccess("Profil gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarFile(file: File | null) {
    if (!file) return;
    if (file.size > AVATAR_MAX_BYTES) {
      setError(`Avatar max. ${AVATAR_MAX_MB} MB.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei wählen.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatarUrl(result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Panel>
        <div className="mb-4 flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/10">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                {(username || "U")[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{profile?.username ?? "Profil"}</h3>
            <p className="text-sm font-medium text-primary">
              {formatCount(profile?.followersCount ?? 0)} Follower
            </p>
            <p className="text-sm text-muted">{profile?.isOnline ? "Online" : "Offline"}</p>
          </div>
        </div>

        <FollowerStats
          followersCount={profile?.followersCount ?? 0}
          followingCount={profile?.followingCount ?? 0}
          postsCount={profile?.postsCount ?? 0}
          onFollowersClick={() => {
            setFollowTab("followers");
            setShowFollowList(true);
          }}
          onFollowingClick={() => {
            setFollowTab("following");
            setShowFollowList(true);
          }}
        />

        {showFollowList && profile?.userId ? (
          <FollowersPanel
            userId={profile.userId}
            followersCount={profile.followersCount ?? 0}
            followingCount={profile.followingCount ?? 0}
            defaultTab={followTab}
            onCountsChange={(followers, following) =>
              setProfile((p) => (p ? { ...p, followersCount: followers, followingCount: following } : p))
            }
          />
        ) : null}

        <div className="mb-4 mt-4 grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-xl bg-black/20 px-2 py-3">
            <p className="text-lg font-bold">{profile?.messagesSent ?? 0}</p>
            <p className="text-xs text-muted">Nachrichten</p>
          </div>
          <div className="rounded-xl bg-black/20 px-2 py-3">
            <p className="text-lg font-bold">{profile?.xp ?? 0}</p>
            <p className="text-xs text-muted">XP</p>
          </div>
        </div>

        <ErrorBanner message={error} />
        {success ? (
          <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <FieldLabel>Benutzername</FieldLabel>
            <TextInput
              value={username}
              minLength={USERNAME_MIN_LENGTH}
              disabled={usernameLocked}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className={`mt-1 text-xs ${usernameLocked ? "text-amber-300" : "text-muted"}`}>
              {usernameHint}
            </p>
          </div>
          <div>
            <FieldLabel>Bio</FieldLabel>
            <TextArea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Avatar (URL oder Upload, max. {AVATAR_MAX_MB} MB)</FieldLabel>
            <TextInput
              value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs text-muted"
              onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <PrimaryButton loading={saving} onClick={save} className="w-full">
            Speichern
          </PrimaryButton>
        </div>
      </Panel>
    </div>
  );
}
