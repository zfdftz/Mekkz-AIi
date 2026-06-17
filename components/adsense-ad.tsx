"use client";

import { useEffect, useRef } from "react";
import { getAdSenseClientId, getAdSenseSlot, type AdSensePlacement } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSenseAd({
  placement,
  className = "",
  label = "Werbung"
}: {
  placement: AdSensePlacement;
  className?: string;
  label?: string;
}) {
  const pushed = useRef(false);
  const clientId = getAdSenseClientId();
  const slot = getAdSenseSlot(placement);

  useEffect(() => {
    if (!clientId || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // Ad blockers or script not loaded yet.
    }
  }, [clientId, slot]);

  if (!clientId || !slot) return null;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-black/15 ${className}`.trim()}
      aria-label={label}
    >
      <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
