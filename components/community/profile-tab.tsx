"use client";

import { Crown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ProfileStyleShell } from "@/components/rewards/profile-style-banner";
import { BadgesTitlesPanel } from "@/components/rewards/badges-titles-panel";
import { getSeasonUiClass } from "@/lib/rewards/season-theme";
import { TITLES } from "@/lib/rewards/catalog";
import { filterShowcaseBadges, stripIdentityBadgeIds } from "@/lib/rewards/showcase-rules";
import { storeAccent } from "@/lib/accent-color";
import { readJsonResponse } from "@/lib/fetch-json";
import type { UserProfile } from "@/lib/community/types";

const AVATAR_MAX_MB = Math.round(AVATAR_MAX_BYTES / (1024 * 1024));

function profileToRewardsForm(profile: UserProfile | null): RewardsFormState {
  const showcasedBadges = filterShowcaseBadges(profile?.showcasedBadges ?? []);
  return {
    showcaseIds: showcasedBadges.map((b) => b.id),
    profileBackground: profile?.profileBackground ?? null,
    accentColor: profile?.accentColor ?? "#8b5cf6",
    activeTitle: profile?.activeTitle ?? null,
    showcasedBadges
  };
}

export function ProfileTab({ initialProfile }: { initialProfile?: UserProfile | null }) {
  const { openProfile } = useProfileModal();
  const seasonClass = getSeasonUiClass();
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null);
  const [username, setUsername] = useState(initialProfile?.username ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatarUrl ?? "");
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFollowList, setShowFollowList] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");
  const [showBadgesPanel, setShowBadgesPanel] = useState(false);
  const [rewardsForm, setRewardsForm] = useState<RewardsFormState>(() =>
    profileToRewardsForm(initialProfile ?? null)
  );

  useEffect(() => {
    if (initialProfile?.accentColor) storeAccent(initialProfile.accentColor);
  }, [initialProfile?.accentColor]);

  const usernameLocked = profile?.canChangeUsername === false;
  const usernameHint = useMemo(() => {
    if (usernameLocked && profile?.nextUsernameChangeAt) {
      return `Nächste Änderung ab ${new Date(profile.nextUsernameChangeAt).toLocaleDateString("de-DE")} (30-Tage-Limit).`;
    }
    return `Mindestens ${USERNAME_MIN_LENGTH}, maximal ${USERNAME_MAX_LENGTH} Zeichen. Jeder Name ist einmalig (Groß/Klein egal).`;
  }, [usernameLocked, profile?.nextUsernameChangeAt]);

  const rewardsSeed = useMemo(() => profileToRewardsForm(profile), [profile]);

  const previewTitle = useMemo(() => {
    if (!rewardsForm.activeTitle) return null;
    return TITLES[rewardsForm.activeTitle]?.label ?? profile?.activeTitleLabel ?? null;
  }, [rewardsForm.activeTitle, profile?.activeTitleLabel]);

  const previewBadges = rewardsForm.showcasedBadges ?? profile?.showcasedBadges ?? [];

  const planBadgeClass =
    profile?.plan === "ultra"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : profile?.plan === "pro"
        ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
        : "border-white/20 bg-white/10 text-muted";

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/community/profile");
      const data = await readJsonResponse<{ profile?: UserProfile; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Profil konnte nicht geladen werden.");
      setProfile(data.profile ?? null);
      setUsername(data.profile?.username ?? "");
      setBio(data.profile?.bio ?? "");
      setAvatarUrl(data.profile?.avatarUrl ?? "");
      setRewardsForm(profileToRewardsForm(data.profile ?? null));
      if (data.profile?.accentColor) storeAccent(data.profile.accentColor);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialProfile) return;
    void load(false);
  }, [initialProfile, load]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: {
        username?: string;
        bio: string;
        avatarUrl: string | null;
        showcasedBadgeIds: string[];
        profileBackground: string | null;
        accentColor: string;
        activeTitle: string | null;
      } = {
        bio,
        avatarUrl: avatarUrl.trim() || null,
        showcasedBadgeIds: rewardsForm.showcaseIds,
        profileBackground: rewardsForm.profileBackground,
        accentColor: rewardsForm.accentColor,
        activeTitle: rewardsForm.activeTitle
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
      if (!profileRes.ok) throw new Error(profileData.error || "Speichern fehlgeschlagen.");

      const saved = profileData.profile ?? null;
      setProfile(saved);
      setUsername(saved?.username ?? username);
      setBio(saved?.bio ?? bio);
      setAvatarUrl(saved?.avatarUrl ?? "");
      setRewardsForm(profileToRewardsForm(saved));
      if (saved?.accentColor) storeAccent(saved.accentColor);
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

  if (loading && !profile) return <LoadingState />;

  return (
    <div className="mx-auto max-w-xl">
      <Panel className="overflow-hidden !bg-transparent p-0 shadow-none">
        <ProfileStyleShell
          styleId={rewardsForm.profileBackground}
          seasonClass={seasonClass}
        >
        <form onSubmit={(e) => void save(e)} className="space-y-4 p-4 sm:p-5">
          <div className="flex items-end gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white/20 bg-black/30">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/10 text-2xl font-bold text-primary">
                  {(username || "U")[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <ProfileIdentity
                username={profile?.username ?? "user"}
                title={previewTitle}
                isVerified={profile?.isVerified}
                isCreator={profile?.isCreator}
                isChosen={profile?.isChosen}
                isUltraCreator={profile?.isUltraCreator}
                isFounder={profile?.isFounder}
                badges={previewBadges}
                profileView
              />
              <p className="mt-1 text-sm font-medium text-primary">
                {formatCount(profile?.followersCount ?? 0)} Follower
              </p>
              {typeof profile?.totalLikes === "number" ? (
                <div className="mt-1">
                  <ProfileLikesStat totalLikes={profile.totalLikes} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${planBadgeClass}`}>
              {profile?.plan !== "free" ? <Crown size={10} /> : null}
              {profile?.planLabel ?? "Free"}
            </span>
            <span className="text-xs text-muted">{profile?.isOnline ? "Online" : "Offline"}</span>
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

          <ErrorBanner message={error} />
          {success ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
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
                className="hidden"
                onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="border-t border-white/10 pt-4">
            <ProfileRewardsPanel
              embedded
              profileSeed={rewardsSeed}
              onFormChange={setRewardsForm}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowBadgesPanel(true)}
            className="season-btn w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium"
          >
            Badges & Titles (Quests)
          </button>

          <div className="flex justify-center pt-2">
            <PrimaryButton loading={saving} type="submit" className="min-w-[200px] px-8">
              Speichern
            </PrimaryButton>
          </div>
        </form>
        </ProfileStyleShell>
      </Panel>

      {showBadgesPanel ? <BadgesTitlesPanel onClose={() => setShowBadgesPanel(false)} /> : null}
    </div>
  );
}
