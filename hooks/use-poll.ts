"use client";

import { useEffect, useRef } from "react";

export function usePoll(callback: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const tick = async () => {
      if (!active) return;
      await saved.current();
    };
    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [intervalMs, enabled]);
}
