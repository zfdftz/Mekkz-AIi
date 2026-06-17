"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function DiscordTooltip({
  label,
  description,
  children
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const fallbackTitle = description ? `${label} — ${description}` : label;

  const show = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        title={fallbackTitle}
        aria-label={fallbackTitle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[500] max-w-[240px] -translate-x-1/2 -translate-y-full rounded-md bg-[#111214] px-2.5 py-1.5 text-center text-xs font-medium text-white shadow-xl"
              style={{ left: coords.x, top: coords.y }}
            >
              <span className="block font-semibold">{label}</span>
              {description ? (
                <span className="mt-0.5 block text-[10px] font-normal leading-snug text-[#b5bac1]">
                  {description}
                </span>
              ) : null}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#111214]" />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
