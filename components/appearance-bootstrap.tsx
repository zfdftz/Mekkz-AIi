"use client";

import { useEffect } from "react";
import { applyAppearance, loadAppearance } from "@/lib/theme-config";

/** Re-applies saved theme on client navigation so light/dark stays in sync. */
export function AppearanceBootstrap() {
  useEffect(() => {
    const saved = loadAppearance();
    applyAppearance(saved.mode, saved.color);
  }, []);

  return null;
}
