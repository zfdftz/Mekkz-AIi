"use client";

import { Crown, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { FollowerStats, FollowersPanel, formatCount } from "@/components/community/followers-panel";
import { PrimaryButton, GhostButton } from "@/components/community/shared";
import { ProfileIdentity } from "@/components/rewards/profile-identity";
import { ProfileLikesStat } from "@/components/rewards/profile-rewards-panel";
import { ProfileStyleShell } from "@/components/rewards/profile-style-banner";
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
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    "none" | "friends" | "pending_outgoing" | "pending_incoming"
  >("none");
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [showFollowList, setShowFollowList] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");
  const seasonClass = getSeasonUiClass();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/users/${userId}?quick=1`);
      const data = await readJsonResponse<{ profile?: PublicUserProfile; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Profil nicht gefunden.");
      setProfile(data.profile ?? null);
      if (data.profile) onProfileLoaded?.(userId, data.profile);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId, onProfileLoaded]);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setLoading(false);
      void load(true);
      return;
    }
    void load(false);
  }, [userId, initialProfile, load]);

  useEffect(() => {
    if (!profile || profile.isSelf) return;
    void fetch(`/api/community/friends?withUserId=${encodeURIComponent(profile.userId)}`)
      .then((r) => r.json())
      .then((d: { status?: typeof friendStatus; requestId?: string }) => {
        if (d.status) setFriendStatus(d.status);
        setIncomingRequestId(d.requestId ?? null);
      });
  }, [profile?.userId, profile?.isSelf]);

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

  async function sendFriendRequest() {
    if (!profile || profile.isSelf) return;
    setFriendBusy(true);
    try {
      const res = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", userId: profile.userId })
      });
      const data = await readJsonResponse<{ status?: string; message?: string }>(res);
      if (res.ok) {
        if (data.status === "mutual_accepted" || data.status === "already_friends") {
          setFriendStatus("friends");
        } else {
          setFriendStatus("pending_outgoing");
        }
      }
    } finally {
      setFriendBusy(false);
    }
  }

  async function respondFriendRequest(accept: boolean) {
    if (!incomingRequestId) return;
    setFriendBusy(true);
    try {
      const res = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", requestId: incomingRequestId, accept })
      });
      if (res.ok) {
        setFriendStatus(accept ? "friends" : "none");
        setIncomingRequestId(null);
      }
    } finally {
      setFriendBusy(false);
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
        <ProfileStyleShell
          styleId={profile?.profileBackground}
          profileFrame={profile?.profileFrame}
          seasonClass={seasonClass}
          className="max-h-[92vh] min-h-[320px] overflow-y-auto"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-1.5 text-white/90 hover:bg-black/70"
          >
            <X size={16} />
          </button>

        {loading && !profile ? (
          <div className="space-y-3 p-5">
            <div className="h-16 w-16 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-48 animate-pulse rounded bg-white/10" />
          </div>
        ) : error || !profile ? (
          <p className="p-6 text-center text-sm text-red-300">{error ?? "Nicht gefunden."}</p>
        ) : (
          <div className="px-4 pb-5 pt-5">
            <div className="flex items-end gap-3">
              <FramedAvatar profile={profile} />
              <div className="mb-1 min-w-0 flex-1">
                <ProfileIdentity
                  username={profile.username ?? "user"}
                  title={profile.activeTitleLabel}
                  isVerified={profile.isVerified}
                  isCreator={profile.isCreator}
                  isChosen={profile.isChosen}
                  isUltraCreator={profile.isUltraCreator}
                  isFounder={profile.isFounder}
                  badges={profile.showcasedBadges}
                  profileView
                />
                <p className="text-xs text-muted">{formatCount(profile.followersCount)} Follower</p>
                {typeof profile.totalLikes === "number" ? (
                  <div className="mt-0.5">
                    <ProfileLikesStat totalLikes={profile.totalLikes} />
                  </div>
                ) : null}
              </div>
              {!profile.isSelf ? (
                <div className="flex shrink-0 flex-col gap-1.5">
                  <PrimaryButton
                    className="season-btn px-3 py-1.5 text-xs"
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
                  {friendStatus === "friends" ? (
                    <GhostButton className="px-3 py-1.5 text-xs text-emerald-300" disabled>
                      <UserCheck size={12} className="mr-1 inline" /> Freunde
                    </GhostButton>
                  ) : friendStatus === "pending_outgoing" ? (
                    <GhostButton className="px-3 py-1.5 text-xs" disabled>
                      Anfrage gesendet
                    </GhostButton>
                  ) : friendStatus === "pending_incoming" ? (
                    <PrimaryButton
                      className="season-btn px-3 py-1.5 text-xs"
                      loading={friendBusy}
                      onClick={() => void respondFriendRequest(true)}
                    >
                      Anfrage annehmen
                    </PrimaryButton>
                  ) : (
                    <GhostButton
                      className="px-3 py-1.5 text-xs"
                      disabled={friendBusy}
                      onClick={() => void sendFriendRequest()}
                    >
                      <UserPlus size={12} className="mr-1 inline" /> Freund hinzufügen
                    </GhostButton>
                  )}
                </div>
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
          </div>
        )}
        </ProfileStyleShell>
      </motion.div>
    </motion.div>
  );
}

function FramedAvatar({ profile }: { profile: PublicUserProfile }) {
  return (
    <div className="relative h-[80px] w-[80px] shrink-0 rounded-full border-2 border-white/20 bg-black/30 p-[2px]">
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
