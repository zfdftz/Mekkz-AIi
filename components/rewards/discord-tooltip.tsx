"use client";

import type { ReactNode } from "react";

export function DiscordTooltip({
  label,
  description,
  children
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-md bg-[#111214] px-2.5 py-1.5 text-center text-xs font-medium text-white shadow-lg group-hover:block">
        <span className="block font-semibold">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[10px] font-normal text-[#b5bac1]">{description}</span>
        ) : null}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#111214]" />
      </span>
    </span>
  );
}
