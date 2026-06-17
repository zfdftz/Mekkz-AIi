import type { LayoutMode } from "./types";

export type { LayoutMode };

export const LAYOUT_COOKIE = "mekkz_layout";
export const LAYOUT_STORAGE_KEY = "mekkz_layout";

export function getDefaultLayoutMode(): LayoutMode {
  return "hub";
}

export function readLayoutModeFromCookie(cookieHeader: string | null): LayoutMode {
  if (!cookieHeader) return getDefaultLayoutMode();
  const match = cookieHeader.match(/(?:^|;\s*)mekkz_layout=(classic|hub)(?:;|$)/);
  return match?.[1] === "classic" ? "classic" : "hub";
}

export function saveLayoutMode(mode: LayoutMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  document.cookie = `${LAYOUT_COOKIE}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
}

export function readLayoutModeFromStorage(): LayoutMode {
  if (typeof window === "undefined") return getDefaultLayoutMode();
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  return stored === "classic" ? "classic" : "hub";
}

export function homePathForLayout(mode: LayoutMode) {
  return mode === "classic" ? "/chat" : "/hub";
}
