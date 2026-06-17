const STORAGE_KEY = "mekkz_accent_color";
const EVENT_NAME = "mekkz-accent-update";

export function readStoredAccent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeAccent(color: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, color);
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: color }));
}

export function onAccentChange(handler: (color: string) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === "string") handler(detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
