"use client";

import { Crown, UserMinus, UserPlus, X } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { FollowerStats, FollowersPanel, formatCount } from "@/components/community/followers-panel";
import { LoadingState, PrimaryButton } from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";
import type { PublicUserProfile } from "@/lib/community/types";

export function ProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [showFollowList, setShowFollowList] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/users/${userId}`);
      const data = await readJsonResponse<{ profile?: PublicUserProfile; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Profil nicht gefunden.");
      setProfile(data.profile ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold">Profil</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : error || !profile ? (
          <p className="p-6 text-center text-sm text-red-300">{error ?? "Nicht gefunden."}</p>
        ) : (
          <div className="p-5">
            <div className="flex gap-4">
              <Avatar url={profile.avatarUrl} name={profile.username ?? "U"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">@{profile.username ?? "user"}</p>
                <p className="text-sm font-medium text-primary">
                  {formatCount(profile.followersCount)} Follower
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${planBadgeClass}`}
                >
                  {profile.plan !== "free" ? <Crown size={12} /> : null}
                  {profile.planLabel}
                </span>
                {profile.plan !== "free" && profile.planSince ? (
                  <p className="mt-1 text-xs text-muted">{profile.planLabel} seit {profile.planSince}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted">Beigetreten {profile.joinedAt}</p>
              </div>
            </div>

            {profile.bio ? <p className="mt-4 text-sm text-muted">{profile.bio}</p> : null}

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

            {!profile.isSelf ? (
              <PrimaryButton className="mt-4 w-full" loading={followBusy} onClick={toggleFollow}>
                {profile.isFollowing ? (
                  <>
                    <UserMinus size={14} className="mr-1 inline" /> Entfolgen
                  </>
                ) : (
                  <>
                    <UserPlus size={14} className="mr-1 inline" /> Folgen
                  </>
                )}
              </PrimaryButton>
            ) : null}

            {showFollowList ? (
              <FollowersPanel
                userId={profile.userId}
                followersCount={profile.followersCount}
                followingCount={profile.followingCount}
                defaultTab={followTab}
                onCountsChange={(followers, following) =>
                  setProfile((p) => (p ? { ...p, followersCount: followers, followingCount: following } : p))
                }
              />
            ) : null}

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                Top 3 Posts (Likes)
              </p>
              {profile.topPosts.length === 0 ? (
                <p className="text-sm text-muted">Noch keine Posts.</p>
              ) : (
                <div className="space-y-2">
                  {profile.topPosts.map((post) => (
                    <div key={post.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                      <p className="line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                      {post.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.imageUrl} alt="" className="mt-2 max-h-32 rounded-lg object-cover" />
                      ) : null}
                      {post.videoUrl ? (
                        <video src={post.videoUrl} controls className="mt-2 max-h-40 w-full rounded-lg" />
                      ) : null}
                      <p className="mt-2 text-xs text-muted">❤ {post.likesCount} Likes</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/15 bg-primary/20">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">
          {name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}
