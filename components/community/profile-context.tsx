"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ProfileModal } from "@/components/community/profile-modal";
import type { PublicUserProfile } from "@/lib/community/types";

type CacheEntry = { profile: PublicUserProfile; at: number };

type ProfileContextValue = {
  openProfile: (userId: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);
const CACHE_TTL_MS = 90_000;

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [initialProfile, setInitialProfile] = useState<PublicUserProfile | null>(null);

  const openProfile = useCallback((id: string) => {
    if (!id) return;
    const cached = cacheRef.current.get(id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setInitialProfile(cached.profile);
    } else {
      setInitialProfile(null);
      void fetch(`/api/community/users/${id}?quick=1`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile) {
            cacheRef.current.set(id, { profile: d.profile, at: Date.now() });
            setInitialProfile((prev) => prev ?? d.profile);
          }
        })
        .catch(() => {});
    }
    setUserId(id);
  }, []);

  const closeProfile = useCallback(() => {
    setUserId(null);
    setInitialProfile(null);
  }, []);

  const onProfileLoaded = useCallback((id: string, profile: PublicUserProfile) => {
    cacheRef.current.set(id, { profile, at: Date.now() });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [userId]);

  const modal =
    userId && typeof document !== "undefined" ? (
      <ProfileModal
        userId={userId}
        initialProfile={initialProfile}
        onProfileLoaded={onProfileLoaded}
        onClose={closeProfile}
        onOpenProfile={openProfile}
      />
    ) : null;

  return (
    <ProfileContext.Provider value={{ openProfile }}>
      {children}
      {modal ? createPortal(modal, document.body) : null}
    </ProfileContext.Provider>
  );
}

export function useProfileModal() {
  const ctx = useContext(ProfileContext);
  if (!ctx) return { openProfile: () => {} };
  return ctx;
}

export function ProfileLink({
  userId,
  children,
  className = "",
  disabled
}: {
  userId: string | null | undefined;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { openProfile } = useProfileModal();
  if (!userId || disabled) {
    return <span className={className}>{children}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => openProfile(userId)}
      className={`transition hover:text-primary hover:underline ${className}`}
    >
      {children}
    </button>
  );
}
