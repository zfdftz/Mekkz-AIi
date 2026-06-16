"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useProfileModal } from "@/components/community/profile-context";
import { GhostButton, LoadingState, PrimaryButton } from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";
import type { FollowUser } from "@/lib/community/types";

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

type FollowersPanelProps = {
  userId: string;
  followersCount: number;
  followingCount: number;
  defaultTab?: "followers" | "following";
  onCountsChange?: (followers: number, following: number) => void;
};

export function FollowersPanel({
  userId,
  followersCount,
  followingCount,
  defaultTab = "followers",
  onCountsChange
}: FollowersPanelProps) {
  const [tab, setTab] = useState<"followers" | "following">(defaultTab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { openProfile } = useProfileModal();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/community/follow?userId=${userId}&type=${tab === "followers" ? "followers" : "following"}`
      );
      const data = await readJsonResponse<{ users?: FollowUser[] }>(res);
      if (res.ok) setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [userId, tab]);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFollow(targetId: string, currentlyFollowing: boolean) {
    const res = await fetch("/api/community/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetId })
    });
    const data = await readJsonResponse<{
      following?: boolean;
      followersCount?: number;
      followingCount?: number;
    }>(res);
    if (!res.ok) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === targetId ? { ...u, isFollowing: data.following ?? !currentlyFollowing } : u
      )
    );
    if (onCountsChange && data.followersCount != null) {
      onCountsChange(data.followersCount, followingCount);
    }
    await load();
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex rounded-xl border border-white/10 bg-black/20 p-1">
        <button
          type="button"
          onClick={() => setTab("followers")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            tab === "followers" ? "bg-primary text-white" : "text-muted hover:text-fg"
          }`}
        >
          {formatCount(followersCount)} Follower
        </button>
        <button
          type="button"
          onClick={() => setTab("following")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            tab === "following" ? "bg-primary text-white" : "text-muted hover:text-fg"
          }`}
        >
          {formatCount(followingCount)} Following
        </button>
      </div>

      {loading ? (
        <LoadingState label="Laden…" />
      ) : users.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          {tab === "followers" ? "Noch keine Follower." : "Folgt noch niemandem."}
        </p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {users.map((user) => (
            <div
              key={user.userId}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => openProfile(user.userId)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <MiniAvatar url={user.avatarUrl} name={user.username ?? "U"} />
                <span className="truncate font-medium">@{user.username ?? "user"}</span>
              </button>
              {!user.isViewer && user.isFollowing !== undefined ? (
                user.isFollowing ? (
                  <GhostButton
                    className="!px-2 !py-1 text-xs"
                    onClick={() => toggleFollow(user.userId, true)}
                  >
                    <UserMinus size={12} />
                  </GhostButton>
                ) : (
                  <PrimaryButton
                    className="!px-2 !py-1 text-xs"
                    onClick={() => toggleFollow(user.userId, false)}
                  >
                    <UserPlus size={12} />
                  </PrimaryButton>
                )
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FollowerStats({
  followersCount,
  followingCount,
  postsCount,
  onFollowersClick,
  onFollowingClick
}: {
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}) {
  return (
    <div className={`grid gap-2 text-center ${postsCount != null ? "grid-cols-3" : "grid-cols-2"}`}>
      <StatButton
        value={followersCount}
        label="Follower"
        onClick={onFollowersClick}
        highlight
      />
      <StatButton value={followingCount} label="Following" onClick={onFollowingClick} />
      {postsCount != null ? (
        <div className="rounded-xl bg-white/5 px-2 py-3">
          <p className="text-xl font-bold tabular-nums">{formatCount(postsCount)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted">Posts</p>
        </div>
      ) : null}
    </div>
  );
}

function StatButton({
  value,
  label,
  onClick,
  highlight
}: {
  value: number;
  label: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <p className={`text-xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>
        {formatCount(value)}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </>
  );
  if (!onClick) {
    return <div className="rounded-xl bg-white/5 px-2 py-3">{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-white/5 px-2 py-3 transition hover:bg-primary/15 hover:ring-1 hover:ring-primary/30"
    >
      {inner}
    </button>
  );
}

function MiniAvatar({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-primary/20">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
          {name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}
