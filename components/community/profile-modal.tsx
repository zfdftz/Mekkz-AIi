"use client";

import { Crown, UserMinus, UserPlus, X } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { FollowerStats, FollowersPanel, formatCount } from "@/components/community/followers-panel";
import { PrimaryButton } from "@/components/community/shared";
import { BadgeShowcase, ProfileIdentity } from "@/components/rewards/profile-identity";
import { ProfileLikesStat } from "@/components/rewards/profile-rewards-panel";
import { ProfileStyleBanner } from "@/components/rewards/profile-style-banner";
import { getSeasonUiClass } from "@/lib/rewards/season-theme";
import { readJsonResponse } from "@/lib/fetch-json";
import type { PublicUserProfile } from "@/lib/community/types";

export function ProfileModal({
  userId,
  initialProfile,
  onProfileLoaded,
  onClose,
  onOpenProfile
}: {
  userId: string;
  initialProfile?: PublicUserProfile | null;
  onProfileLoaded?: (userId: string, profile: PublicUserProfile) => void;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(!initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [showFollowList, setShowFollowList] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");
  const [tab, setTab] = useState<"about" | "badges">("about");
  const seasonClass = getSeasonUiClass();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/community/users/${userId}`);
      const data = await readJsonResponse<{ profile?: PublicUserProfile; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Profil nicht gefunden.");
      setProfile(data.profile ?? null);
      if (data.profile) onProfileLoaded?.(userId, data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, [userId, onProfileLoaded]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function toggleFollow() {
    if (!profile || profile.isSelf) return;
    setFollowBusy(true);
    try {
      const res = await fetch("/api/community/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.userId })
      });
      const data = await readJsonResponse<{ following?: boolean; followersCount?: number }>(res);
      if (res.ok) {
        setProfile((p) =>
          p
            ? {
                ...p,
                isFollowing: data.following,
                followersCount:
                  data.followersCount ??
                  Math.max(0, p.followersCount + (data.following ? 1 : -1))
              }
            : p
        );
      }
    } finally {
      setFollowBusy(false);
    }
  }

  const planBadgeClass =
    profile?.plan === "ultra"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : profile?.plan === "pro"
        ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
        : "border-white/20 bg-white/10 text-muted";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`discord-profile ${seasonClass} max-h-[92vh] w-full max-w-[440px] overflow-hidden rounded-t-2xl shadow-2xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <ProfileBanner profile={profile} seasonClass={seasonClass} />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white/90 hover:bg-black/70"
          >
            <X size={16} />
          </button>
        </div>

        {loading && !profile ? (
          <div className="space-y-3 p-5">
            <div className="h-16 w-16 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-48 animate-pulse rounded bg-white/10" />
          </div>
        ) : error || !profile ? (
          <p className="p-6 text-center text-sm text-red-300">{error ?? "Nicht gefunden."}</p>
        ) : (
          <div className="max-h-[calc(92vh-120px)] overflow-y-auto px-4 pb-5">
            <div className="-mt-12 flex items-end gap-3">
              <FramedAvatar profile={profile} />
              <div className="mb-1 min-w-0 flex-1">
                <ProfileIdentity
                  username={profile.username ?? "user"}
                  title={profile.activeTitleLabel}
                  isVerified={profile.isVerified}
                  isCreator={profile.isCreator}
                  isChosen={profile.isChosen}
                />
                <p className="text-xs text-muted">{formatCount(profile.followersCount)} Follower</p>
                {typeof profile.totalLikes === "number" ? (
                  <div className="mt-0.5">
                    <ProfileLikesStat totalLikes={profile.totalLikes} />
                  </div>
                ) : null}
              </div>
              {!profile.isSelf ? (
                <PrimaryButton
                  className={`season-btn shrink-0 px-3 py-1.5 text-xs ${profile.isFollowing ? "" : ""}`}
                  loading={followBusy}
                  onClick={toggleFollow}
                >
                  {profile.isFollowing ? (
                    <>
                      <UserMinus size={12} className="mr-1 inline" /> Entfolgen
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} className="mr-1 inline" /> Folgen
                    </>
                  )}
                </PrimaryButton>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${planBadgeClass}`}>
                {profile.plan !== "free" ? <Crown size={10} /> : null}
                {profile.planLabel}
              </span>
              {profile.isOnline ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                </span>
              ) : null}
              <span className="rounded-md bg-white/8 px-2 py-0.5 text-[11px] text-muted">
                Seit {profile.joinedAt}
              </span>
            </div>

            <div className="mt-4 flex gap-1 border-b border-white/10">
              {(["about", "badges"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`season-tab px-3 py-2 text-xs font-medium capitalize ${
                    tab === t ? "season-tab-active" : "text-muted"
                  }`}
                >
                  {t === "about" ? "Über mich" : "Badges"}
                </button>
              ))}
            </div>

            {tab === "about" ? (
              <div className="mt-4 space-y-4">
                {profile.bio ? (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Bio</p>
                    <p className="text-sm leading-relaxed text-[#dbdee1]">{profile.bio}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Keine Bio.</p>
                )}
                <FollowerStats
                  followersCount={profile.followersCount}
                  followingCount={profile.followingCount}
                  postsCount={profile.postsCount}
                  onFollowersClick={() => {
                    setFollowTab("followers");
                    setShowFollowList(true);
                  }}
                  onFollowingClick={() => {
                    setFollowTab("following");
                    setShowFollowList(true);
                  }}
                />
                {showFollowList ? (
                  <FollowersPanel
                    userId={profile.userId}
                    followersCount={profile.followersCount}
                    followingCount={profile.followingCount}
                    defaultTab={followTab}
                    onOpenProfile={onOpenProfile}
                    onCountsChange={(followers, following) =>
                      setProfile((p) => (p ? { ...p, followersCount: followers, followingCount: following } : p))
                    }
                  />
                ) : null}
              </div>
            ) : (
              <div className="mt-4">
                {profile.showcasedBadges && profile.showcasedBadges.length > 0 ? (
                  <BadgeShowcase badges={profile.showcasedBadges} />
                ) : (
                  <p className="text-sm text-muted">Noch keine Badges im Showcase.</p>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ProfileBanner({
  profile,
  seasonClass
}: {
  profile: PublicUserProfile | null;
  seasonClass: string;
}) {
  return (
    <ProfileStyleBanner
      styleId={profile?.profileBackground}
      accentColor={profile?.accentColor}
      seasonClass={seasonClass}
      className="h-[120px] rounded-none border-0"
    />
  );
}

function FramedAvatar({ profile }: { profile: PublicUserProfile }) {
  return (
    <div
      className="relative h-[80px] w-[80px] shrink-0 rounded-full border-2 border-[#232428] p-[2px]"
      style={profile.accentColor ? { boxShadow: `0 0 0 2px ${profile.accentColor}` } : undefined}
    >
      <Avatar url={profile.avatarUrl} name={profile.username ?? "U"} />
      {profile.isOnline ? (
        <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-[#232428] bg-emerald-500" />
      ) : null}
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-full bg-[#5865f2]/30">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
          {name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}
