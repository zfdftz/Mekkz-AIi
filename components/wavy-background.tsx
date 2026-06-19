"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { onAccentChange, readStoredAccent } from "@/lib/accent-color";
import { getSeasonAccent } from "@/lib/rewards/season-theme";

export function WavyBackground({
  children,
  accentColor
}: {
  children: ReactNode;
  accentColor?: string | null;
}) {
  const [accent, setAccent] = useState(
    () => accentColor ?? readStoredAccent() ?? getSeasonAccent()
  );

  useEffect(() => {
    if (accentColor) setAccent(accentColor);
  }, [accentColor]);

  useEffect(() => onAccentChange(setAccent), []);

  return (
    <div
      className="wavy-page season-page-bg season-ui-0 relative min-h-[100dvh] overflow-hidden"
      style={{ "--season-accent": accent, "--user-accent": accent } as CSSProperties}
    >
      <div className="season-page-base" aria-hidden />
      <div className="season-page-stars" aria-hidden />
      <div className="season-page-stars season-page-stars-deep" aria-hidden />
      <div className="season-page-nebula" aria-hidden />
      <div className="season-page-galaxy" aria-hidden />
      <div className="season-page-glow" aria-hidden />
      <div className="season-page-fx" aria-hidden />
      <div className="season-page-vignette" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
