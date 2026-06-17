"use client";

import {
  getCosmetic,
  getProfileBackgroundClass,
  resolveEquippedStyleId
} from "@/lib/rewards/catalog";
import type { CSSProperties } from "react";

export function ProfileStyleBanner({
  styleId,
  profileFrame,
  accentColor,
  className = "h-24",
  seasonClass
}: {
  styleId?: string | null;
  profileFrame?: string | null;
  accentColor?: string | null;
  className?: string;
  seasonClass?: string;
}) {
  const equipped = resolveEquippedStyleId(styleId, profileFrame);
  const bgClass = getProfileBackgroundClass(equipped);
  const hasCustomStyle = Boolean(equipped);
  const cosmetic = equipped ? getCosmetic(equipped) : null;
  const isFrameStyle = cosmetic?.type === "frame";

  return (
    <div
      className={`discord-profile-banner profile-style-banner relative w-full overflow-hidden bg-cover bg-center ${bgClass} ${className} ${
        hasCustomStyle ? "profile-style-custom" : seasonClass ? `${seasonClass}-banner` : ""
      }`}
      style={accentColor ? ({ "--profile-accent": accentColor } as CSSProperties) : undefined}
    >
      {isFrameStyle ? (
        <div className="profile-style-rings pointer-events-none absolute inset-0" aria-hidden />
      ) : null}
      {!hasCustomStyle ? (
        <div className="season-stars pointer-events-none absolute inset-0 opacity-60" />
      ) : null}
      {accentColor ? (
        <div
          className={`pointer-events-none absolute inset-0 mix-blend-soft-light ${
            hasCustomStyle ? "opacity-20" : "opacity-35"
          }`}
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, transparent 50%, ${accentColor}66 100%)`
          }}
        />
      ) : null}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          hasCustomStyle ? "from-[#232428]/75" : "from-[#232428]/90"
        } via-transparent to-transparent`}
      />
    </div>
  );
}

export function resolveProfileStyleId(
  profileBackground?: string | null,
  profileFrame?: string | null
) {
  return resolveEquippedStyleId(profileBackground, profileFrame);
}
