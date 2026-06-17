"use client";

import { BadgeCheck } from "lucide-react";
import { DiscordTooltip } from "@/components/rewards/discord-tooltip";

type BadgeChip = { id: string; name: string; description: string; icon: string };

function UltraCreatorMark({ compact, profileView }: { compact?: boolean; profileView?: boolean }) {
  return (
    <DiscordTooltip label="Ultra Creator" description="100.000+ Follower">
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sky-500/20 font-bold text-sky-300 ${
          profileView ? "h-5 w-5 text-[10px]" : compact ? "h-3.5 w-3.5 text-[8px]" : "h-4 w-4 text-[10px]"
        }`}
        aria-label="Ultra Creator"
      >
        ✕
      </span>
    </DiscordTooltip>
  );
}

export function ProfileIdentity({
  username,
  title,
  isVerified,
  isCreator,
  isChosen,
  isUltraCreator,
  badges,
  compact,
  profileView
}: {
  username: string;
  title?: string | null;
  isVerified?: boolean;
  isCreator?: boolean;
  isChosen?: boolean;
  isUltraCreator?: boolean;
  badges?: BadgeChip[];
  compact?: boolean;
  /** TikTok-style header: name + badges inline, no @ prefix */
  profileView?: boolean;
}) {
  const nameClass = profileView
    ? "truncate text-lg font-bold leading-tight"
    : compact
      ? "truncate font-medium"
      : "truncate font-medium";
  const iconSize = profileView ? 18 : compact ? 14 : 16;

  return (
    <span className={`inline-flex min-w-0 flex-col ${compact && !profileView ? "" : "gap-0.5"}`}>
      <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
        {!profileView ? <span className={nameClass}>@{username}</span> : null}
        {profileView ? <span className={nameClass}>{username}</span> : null}
        {isVerified ? (
          <DiscordTooltip label="Verified" description="Verifiziertes Konto (25.000+ Follower)">
            <span className="inline-flex shrink-0 text-sky-400" aria-label="Verified">
              <BadgeCheck size={iconSize} className="fill-sky-500/25 stroke-[2.5]" />
            </span>
          </DiscordTooltip>
        ) : null}
        {isCreator ? (
          <DiscordTooltip label="Mekkz AI Creator" description="Offizieller Creator">
            <span
              className={`inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500/25 font-bold text-emerald-300 ${
                profileView ? "h-5 min-w-5 text-[11px]" : compact ? "h-3.5 min-w-3.5 px-0.5 text-[8px]" : "h-4 min-w-4 px-1 text-[10px]"
              }`}
            >
              ✦
            </span>
          </DiscordTooltip>
        ) : null}
        {isChosen ? (
          <DiscordTooltip label="The Chosen One" description="Von Mekkz AI ausgewählt">
            <span className="inline-flex shrink-0 text-red-500" aria-label="The Chosen One">
              <BadgeCheck size={iconSize} className="fill-red-500/30 stroke-[2.5]" />
            </span>
          </DiscordTooltip>
        ) : null}
        {isUltraCreator ? <UltraCreatorMark compact={compact} profileView={profileView} /> : null}
      </span>
      {title ? (
        <span
          className={`truncate text-primary ${profileView ? "text-sm" : compact ? "text-[10px]" : "text-xs"}`}
        >
          {title}
        </span>
      ) : null}
      {badges && badges.length > 0 && !compact ? (
        <span className={`flex flex-wrap gap-1 ${profileView ? "mt-2" : "mt-1"}`}>
          {badges.map((b) => (
            <DiscordTooltip key={b.id} label={b.name} description={b.description}>
              <span className="inline-flex cursor-help rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs">
                {b.icon}
              </span>
            </DiscordTooltip>
          ))}
        </span>
      ) : null}
    </span>
  );
}

export function BadgeShowcase({ badges }: { badges: BadgeChip[] }) {
  if (badges.length === 0) {
    return <p className="text-xs text-muted">Noch keine Badges.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <DiscordTooltip key={b.id} label={b.name} description={b.description}>
          <span className="inline-flex cursor-help rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-sm backdrop-blur-sm">
            {b.icon}
          </span>
        </DiscordTooltip>
      ))}
    </div>
  );
}
