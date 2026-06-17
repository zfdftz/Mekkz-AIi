"use client";

import { BadgeCheck } from "lucide-react";
import { DiscordTooltip } from "@/components/rewards/discord-tooltip";

type BadgeChip = { id: string; name: string; description: string; icon: string };

export function ProfileIdentity({
  username,
  title,
  isVerified,
  isCreator,
  isChosen,
  badges,
  compact
}: {
  username: string;
  title?: string | null;
  isVerified?: boolean;
  isCreator?: boolean;
  isChosen?: boolean;
  badges?: BadgeChip[];
  compact?: boolean;
}) {
  return (
    <span className={`inline-flex min-w-0 flex-col ${compact ? "" : "gap-0.5"}`}>
      <span className="inline-flex min-w-0 items-center gap-1">
        <span className="truncate font-medium">@{username}</span>
        {isVerified ? (
          <DiscordTooltip label="Verified" description="Verifiziertes Konto">
            <span className="inline-flex shrink-0 text-sky-400" aria-label="Verified">
              <BadgeCheck size={compact ? 14 : 16} className="fill-sky-500/20" />
            </span>
          </DiscordTooltip>
        ) : null}
        {isChosen ? (
          <DiscordTooltip label="The Chosen One" description="Von Mekkz AI ausgewählt">
            <span className="inline-flex shrink-0 text-red-500" aria-label="The Chosen One">
              <BadgeCheck size={compact ? 14 : 16} className="fill-red-500/25" />
            </span>
          </DiscordTooltip>
        ) : null}
        {isCreator ? (
          <DiscordTooltip label="Mekkz AI Creator" description="Offizieller Creator">
            <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-300">
              ✦
            </span>
          </DiscordTooltip>
        ) : null}
      </span>
      {title ? (
        <span className={`truncate text-primary ${compact ? "text-[10px]" : "text-xs"}`}>{title}</span>
      ) : null}
      {badges && badges.length > 0 && !compact ? (
        <span className="mt-1 flex flex-wrap gap-1">
          {badges.map((b) => (
            <DiscordTooltip key={b.id} label={b.name} description={b.description}>
              <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs">
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
    return <p className="text-xs text-muted">Noch keine Badges im Showcase.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <DiscordTooltip key={b.id} label={b.name} description={b.description}>
          <div className="flex cursor-help items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-sm">
            <span>{b.icon}</span>
            <span className="text-xs font-medium">{b.name}</span>
          </div>
        </DiscordTooltip>
      ))}
    </div>
  );
}
