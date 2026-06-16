"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ProfileModal } from "@/components/community/profile-modal";

type ProfileContextValue = {
  openProfile: (userId: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const openProfile = useCallback((id: string) => {
    if (id) setUserId(id);
  }, []);

  return (
    <ProfileContext.Provider value={{ openProfile }}>
      {children}
      {userId ? <ProfileModal userId={userId} onClose={() => setUserId(null)} /> : null}
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
