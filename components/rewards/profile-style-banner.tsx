"use client";

import {
  getCosmetic,
  getProfileBackgroundClass,
  resolveEquippedStyleId
} from "@/lib/rewards/catalog";
import type { CSSProperties, ReactNode } from "react";

type StyleProps = {
  styleId?: string | null;
  profileFrame?: string | null;
  accentColor?: string | null;
  seasonClass?: string;
};

function useEquippedStyle({ styleId, profileFrame }: StyleProps) {
  const equipped = resolveEquippedStyleId(styleId, profileFrame);
  const bgClass = getProfileBackgroundClass(equipped);
  const hasCustomStyle = Boolean(equipped);
  const cosmetic = equipped ? getCosmetic(equipped) : null;
  const isFrameStyle = cosmetic?.type === "frame";
  return { equipped, bgClass, hasCustomStyle, isFrameStyle };
}

/** Full-bleed animated background layer (fixed, no filter animations). */
export function ProfileStyleBackground({
  styleId,
  profileFrame,
  accentColor,
  seasonClass,
  className = ""
}: StyleProps & { className?: string }) {
  const { bgClass, hasCustomStyle, isFrameStyle } = useEquippedStyle({ styleId, profileFrame });

  return (
    <div
      className={`profile-style-background ${bgClass} ${className} ${
        hasCustomStyle ? "profile-bg-animated" : seasonClass ? `${seasonClass}-banner` : ""
      }`}
      aria-hidden
    >
      {isFrameStyle ? <div className="profile-style-rings" /> : null}
      {!hasCustomStyle ? <div className="season-profile-fx" aria-hidden /> : null}
      {hasCustomStyle ? <div className="profile-bg-drift-layer" /> : null}
    </div>
  );
}

/** Wraps profile UI: animated bg on the whole card, readable text on top. */
export function ProfileStyleShell({
  styleId,
  profileFrame,
  accentColor,
  seasonClass,
  className = "",
  children
}: StyleProps & { className?: string; children: ReactNode }) {
  return (
    <div className={`profile-style-shell ${seasonClass ?? ""} relative isolate overflow-hidden ${className}`}>
      <ProfileStyleBackground
        styleId={styleId}
        profileFrame={profileFrame}
        accentColor={accentColor}
        seasonClass={seasonClass}
      />
      <div className="profile-style-scrim" aria-hidden />
      <div className="profile-style-content relative z-[2]">{children}</div>
    </div>
  );
}

/** Small preview strip (background picker only). */
export function ProfileStyleBanner({
  styleId,
  profileFrame,
  accentColor,
  className = "h-20",
  seasonClass
}: StyleProps & { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 ${className}`}>
      <ProfileStyleBackground
        styleId={styleId}
        profileFrame={profileFrame}
        accentColor={accentColor}
        seasonClass={seasonClass}
        className="rounded-xl"
      />
      <div className="profile-style-scrim rounded-xl opacity-80" aria-hidden />
    </div>
  );
}

export function resolveProfileStyleId(
  profileBackground?: string | null,
  profileFrame?: string | null
) {
  return resolveEquippedStyleId(profileBackground, profileFrame);
}
