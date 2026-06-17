"use client";

import { getProfileBackgroundClass, resolveEquippedStyleId } from "@/lib/rewards/catalog";

export function ProfileStyleBanner({
  styleId,
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
  const equipped = styleId ?? null;
  const bgClass = getProfileBackgroundClass(equipped);
  const hasCustomStyle = Boolean(equipped);

  return (
    <div
      className={`discord-profile-banner relative w-full overflow-hidden rounded-xl border border-white/10 bg-cover bg-center ${bgClass} ${className} ${
        hasCustomStyle ? "" : seasonClass ? `${seasonClass}-banner` : ""
      }`}
    >
      {!hasCustomStyle ? (
        <div className="season-stars pointer-events-none absolute inset-0 opacity-60" />
      ) : null}
      {accentColor ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-35 mix-blend-soft-light"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, transparent 55%, ${accentColor}88 100%)`
          }}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#232428]/90 via-transparent to-transparent" />
    </div>
  );
}

export function resolveProfileStyleId(
  profileBackground?: string | null,
  profileFrame?: string | null
) {
  return resolveEquippedStyleId(profileBackground, profileFrame);
}
