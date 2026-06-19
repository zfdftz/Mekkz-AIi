export type ThemeMode = "dark" | "light";
export type ColorTheme =
  | "violet"
  | "red-green"
  | "blue"
  | "sunset"
  | "emerald"
  | "rose";

export const COLOR_THEMES: {
  id: ColorTheme;
  label: string;
  swatch: [string, string];
}[] = [
  { id: "violet", label: "Standard Colors", swatch: ["#7c3aed", "#090014"] },
  { id: "red-green", label: "Wavy Rot & Grün", swatch: ["#ef4444", "#22c55e"] },
  { id: "blue", label: "Blau Ozean", swatch: ["#3b82f6", "#06b6d4"] },
  { id: "sunset", label: "Sunset", swatch: ["#f97316", "#ec4899"] },
  { id: "emerald", label: "Emerald", swatch: ["#10b981", "#064e3b"] },
  { id: "rose", label: "Rose Gold", swatch: ["#f43f5e", "#fbbf24"] }
];

const VALID_COLORS: ColorTheme[] = [
  "violet",
  "red-green",
  "blue",
  "sunset",
  "emerald",
  "rose"
];

export const APPEARANCE_CHANGE_EVENT = "mekkz-appearance-change";

export function applyAppearance(mode: ThemeMode, color: ColorTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.setAttribute("data-color", color);
  root.style.colorScheme = mode;
  localStorage.setItem("theme", mode);
  localStorage.setItem("color-theme", color);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(APPEARANCE_CHANGE_EVENT, { detail: { mode, color } })
    );
  }
}

export function subscribeAppearance(
  listener: (appearance: { mode: ThemeMode; color: ColorTheme }) => void
) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ mode: ThemeMode; color: ColorTheme }>).detail;
    if (detail?.mode && detail?.color) listener(detail);
  };
  window.addEventListener(APPEARANCE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(APPEARANCE_CHANGE_EVENT, handler);
}

export function loadAppearance(): { mode: ThemeMode; color: ColorTheme } {
  const mode = (localStorage.getItem("theme") as ThemeMode) || "dark";
  const saved = localStorage.getItem("color-theme") as ColorTheme;
  const color = VALID_COLORS.includes(saved) ? saved : "violet";
  return { mode, color };
}
