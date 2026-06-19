"use client";

import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { DiscordTooltip } from "@/components/rewards/discord-tooltip";
import { filterShowcaseBadges } from "@/lib/rewards/showcase-rules";

type BadgeChip = { id: string; name: string; description: string; icon: string };

/** Permanent account status icons (DB flags) — not showcase badges. Order: Chosen → Verified → Creator → Ultra. */
function IdentityMark({
  size,
  className,
  children,
  label,
  description,
  style
}: {
  size: number;
  className: string;
  children: ReactNode;
  label: string;
  description: string;
  style?: CSSProperties;
}) {
  return (
    <DiscordTooltip label={label} description={description}>
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
        style={{ width: size, height: size, minWidth: size, ...style }}
        aria-label={label}
      >
        {children}
      </span>
    </DiscordTooltip>
  );
}

function ChosenMark({ size }: { size: number }) {
  return (
    <IdentityMark
      size={size}
      className="bg-red-500 text-white shadow-sm shadow-red-500/40"
      label="The Chosen One"
      description="Von Mekkz AI ausgewählt — permanent, nur Admin kann entfernen."
    >
      <Check size={Math.round(size * 0.58)} strokeWidth={3} aria-hidden />
    </IdentityMark>
  );
}

function VerifiedMark({ size }: { size: number }) {
  return (
    <IdentityMark
      size={size}
      className="bg-[#20D5EC] text-white shadow-sm shadow-sky-400/30"
      label="Verified"
      description="Verifiziertes Konto (25.000+ Follower)."
    >
      <Check size={Math.round(size * 0.58)} strokeWidth={3} aria-hidden />
    </IdentityMark>
  );
}

function CreatorMark({ size }: { size: number }) {
  return (
    <IdentityMark
      size={size}
      className="bg-emerald-500 font-bold leading-none text-white shadow-sm shadow-emerald-500/30"
      label="Mekkz AI Creator"
      description="Offizieller Mekkz AI Creator — permanent."
      style={{ fontSize: Math.max(8, Math.round(size * 0.48)) }}
    >
      ✦
    </IdentityMark>
  );
}

function UltraCreatorMark({ size }: { size: number }) {
  return (
    <IdentityMark
      size={size}
      className="bg-sky-600 font-bold leading-none text-white shadow-sm shadow-sky-600/30"
      label="Ultra Creator"
      description="100.000+ Follower."
      style={{ fontSize: Math.max(7, Math.round(size * 0.42)) }}
    >
      ✕
    </IdentityMark>
  );
}

function FounderMark({ size }: { size: number }) {
  return (
    <IdentityMark
      size={size}
      className="bg-amber-500 font-bold leading-none text-white shadow-sm shadow-amber-500/30"
      label="Founder"
      description="Mekkz Gründer — permanent."
      style={{ fontSize: Math.max(8, Math.round(size * 0.48)) }}
    >
      👑
    </IdentityMark>
  );
}

function IdentityMarks({
  isVerified,
  isCreator,
  isChosen,
  isUltraCreator,
  isFounder,
  markSize
}: {
  isVerified?: boolean;
  isCreator?: boolean;
  isChosen?: boolean;
  isUltraCreator?: boolean;
  isFounder?: boolean;
  markSize: number;
}) {
  if (!isChosen && !isVerified && !isCreator && !isUltraCreator && !isFounder) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-[3px]">
      {isChosen ? <ChosenMark size={markSize} /> : null}
      {isVerified ? <VerifiedMark size={markSize} /> : null}
      {isCreator ? <CreatorMark size={markSize} /> : null}
      {isUltraCreator ? <UltraCreatorMark size={markSize} /> : null}
      {isFounder ? <FounderMark size={markSize} /> : null}
    </span>
  );
}

export function ProfileIdentity({
  username,
  title,
  isVerified,
  isCreator,
  isChosen,
  isUltraCreator,
  isFounder,
  badges,
  compact,
  profileView,
  nameColor,
  onNameClick
}: {
  username: string;
  title?: string | null;
  isVerified?: boolean;
  isCreator?: boolean;
  isChosen?: boolean;
  isUltraCreator?: boolean;
  isFounder?: boolean;
  badges?: BadgeChip[];
  compact?: boolean;
  profileView?: boolean;
  nameColor?: string | null;
  onNameClick?: () => void;
}) {
  const markSize = profileView ? 18 : compact ? 14 : 16;
  const showcaseBadges = badges ? filterShowcaseBadges(badges) : [];
  const nameClass = profileView
    ? "truncate text-lg font-bold leading-none"
    : compact
      ? "truncate text-sm font-semibold leading-none"
      : "truncate font-semibold leading-none";

  const nameStyle = nameColor ? ({ color: nameColor } as CSSProperties) : undefined;
  const NameTag = onNameClick ? "button" : "span";

  return (
    <span className={`inline-flex min-w-0 max-w-full flex-col ${profileView ? "gap-1" : "gap-0.5"}`}>
      {/* TikTok / YouTube: name + status icons on one tight row */}
      <span className="inline-flex min-w-0 max-w-full items-center gap-1">
        <span className={`inline-flex min-w-0 items-center gap-1 ${profileView ? "" : ""}`}>
          {!profileView ? (
            <NameTag
              type={onNameClick ? "button" : undefined}
              onClick={onNameClick}
              className={`${nameClass} text-foreground ${onNameClick ? "cursor-pointer rounded-md hover:bg-white/10 px-0.5 -mx-0.5" : ""}`}
              style={nameStyle}
            >
              @{username}
            </NameTag>
          ) : (
            <NameTag
              type={onNameClick ? "button" : undefined}
              onClick={onNameClick}
              className={`${nameClass} text-foreground ${onNameClick ? "cursor-pointer rounded-md hover:bg-white/10 px-1 -mx-1" : ""}`}
              style={nameStyle}
            >
              {username}
            </NameTag>
          )}
          <IdentityMarks
            isChosen={isChosen}
            isVerified={isVerified}
            isCreator={isCreator}
            isUltraCreator={isUltraCreator}
            isFounder={isFounder}
            markSize={markSize}
          />
        </span>
      </span>

      {title ? (
        <span
          className={`truncate text-primary ${profileView ? "text-sm" : compact ? "text-[10px]" : "text-xs"}`}
        >
          {title}
        </span>
      ) : null}

      {showcaseBadges.length > 0 && !compact ? (
        <span className={`flex flex-wrap gap-1 ${profileView ? "mt-1.5" : "mt-1"}`}>
          {showcaseBadges.map((b) => (
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
  const items = filterShowcaseBadges(badges);
  if (items.length === 0) {
    return <p className="text-xs text-muted">Noch keine Badges.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((b) => (
        <DiscordTooltip key={b.id} label={b.name} description={b.description}>
          <span className="inline-flex cursor-help rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-sm backdrop-blur-sm">
            {b.icon}
          </span>
        </DiscordTooltip>
      ))}
    </div>
  );
}
