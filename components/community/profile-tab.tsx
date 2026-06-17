"use client";

import { Crown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AVATAR_MAX_BYTES,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH
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
import { useProfileModal } from "@/components/community/profile-context";
import { FollowerStats, FollowersPanel, formatCount } from "@/components/community/followers-panel";
import { ProfileIdentity } from "@/components/rewards/profile-identity";
import {
  ProfileLikesStat,
  ProfileRewardsPanel,
  type RewardsFormState
} from "@/components/rewards/profile-rewards-panel";
import { BadgesTitlesPanel } from "@/components/rewards/badges-titles-panel";
import { readJsonResponse } from "@/lib/fetch-json";
import type { UserProfile } from "@/lib/community/types";

const AVATAR_MAX_MB = Math.round(AVATAR_MAX_BYTES / (1024 * 1024));

export function ProfileTab() {
  const { openProfile } = useProfileModal();
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
  const [showBadgesPanel, setShowBadgesPanel] = useState(false);
  const rewardsFormRef = useRef<RewardsFormState | null>(null);

  const usernameLocked = profile?.canChangeUsername === false;
  const usernameHint = useMemo(() => {
    if (usernameLocked && profile?.nextUsernameChangeAt) {
      return `Nächste Änderung ab ${new Date(profile.nextUsernameChangeAt).toLocaleDateString("de-DE")} (30-Tage-Limit).`;
    }
    return `Mindestens ${USERNAME_MIN_LENGTH}, maximal ${USERNAME_MAX_LENGTH} Zeichen. Jeder Name ist einmalig (Groß/Klein egal).`;
  }, [usernameLocked, profile?.nextUsernameChangeAt]);

  const planBadgeClass =
    profile?.plan === "ultra"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : profile?.plan === "pro"
        ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
        : "border-white/20 bg-white/10 text-muted";

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

      const profileRes = await fetch("/api/community/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const profileData = await readJsonResponse<{ profile?: UserProfile; error?: string }>(profileRes);
      if (!profileRes.ok) throw new Error(profileData.error || "Profil speichern fehlgeschlagen.");

      const rewards = rewardsFormRef.current;
      if (rewards) {
        const rewardsRes = await fetch("/api/rewards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            showcasedBadgeIds: rewards.showcaseIds,
            profileBackground: rewards.profileBackground,
            accentColor: rewards.accentColor,
            activeTitle: rewards.activeTitle
          })
        });
        const rewardsData = await readJsonResponse<{ error?: string }>(rewardsRes);
        if (!rewardsRes.ok) throw new Error(rewardsData.error || "Rewards speichern fehlgeschlagen.");
      }

      setProfile(profileData.profile ?? null);
      setUsername(profileData.profile?.username ?? username);
      setSuccess("Profil gespeichert.");
      void load();
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
          <div className="min-w-0 flex-1">
            <ProfileIdentity
              username={profile?.username ?? "user"}
              title={profile?.activeTitleLabel}
              isVerified={profile?.isVerified}
              isCreator={profile?.isCreator}
              isChosen={profile?.isChosen}
              badges={profile?.showcasedBadges}
            />
            <p className="mt-1 text-sm font-medium text-primary">
              {formatCount(profile?.followersCount ?? 0)} Follower
            </p>
            {typeof profile?.totalLikes === "number" ? (
              <div className="mt-1">
                <ProfileLikesStat totalLikes={profile.totalLikes} />
              </div>
            ) : null}
            <p className="text-sm text-muted">{profile?.isOnline ? "Online" : "Offline"}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${planBadgeClass}`}>
            {profile?.plan !== "free" ? <Crown size={10} /> : null}
            {profile?.planLabel ?? "Free"}
          </span>
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
            onOpenProfile={openProfile}
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
              maxLength={USERNAME_MAX_LENGTH}
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
            <FieldLabel>Avatar (Upload / Fotomediathek, max. {AVATAR_MAX_MB} MB)</FieldLabel>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-6 text-sm text-muted transition hover:border-primary/40 hover:bg-black/30">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar Vorschau" className="mb-2 h-20 w-20 rounded-full object-cover" />
              ) : null}
              <span>{avatarUrl ? "Anderes Bild wählen" : "Bild auswählen"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="border-t border-white/10 pt-4">
            <ProfileRewardsPanel
              embedded
              onFormChange={(state) => {
                rewardsFormRef.current = state;
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowBadgesPanel((v) => !v)}
            className="season-btn w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium"
          >
            Badges & Titles (Quests)
          </button>
          <PrimaryButton loading={saving} onClick={save} className="w-full">
            Speichern
          </PrimaryButton>
        </div>
      </Panel>

      {showBadgesPanel ? <BadgesTitlesPanel onClose={() => setShowBadgesPanel(false)} /> : null}
    </div>
  );
}
