export const WATCHER_DISMISS_KEY = "mekkz-watcher-dismissed-until";
export const WATCHER_DISMISS_MS = 2 * 60 * 60 * 1000;

export function readWatcherDismissedUntil(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WATCHER_DISMISS_KEY);
    if (!raw) return null;
    const ts = new Date(raw).getTime();
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

export function isWatcherDismissed(now = Date.now()): boolean {
  const until = readWatcherDismissedUntil();
  return until != null && now < until;
}

export function dismissWatcher(now = Date.now()): number {
  const until = now + WATCHER_DISMISS_MS;
  try {
    localStorage.setItem(WATCHER_DISMISS_KEY, new Date(until).toISOString());
  } catch {
    // Ignore storage errors.
  }
  return until;
}

export function clearWatcherDismissIfExpired(now = Date.now()): boolean {
  const until = readWatcherDismissedUntil();
  if (until == null) return false;
  if (now >= until) {
    try {
      localStorage.removeItem(WATCHER_DISMISS_KEY);
    } catch {
      // Ignore.
    }
    return false;
  }
  return true;
}

export function msUntilWatcherReturns(now = Date.now()): number | null {
  const until = readWatcherDismissedUntil();
  if (until == null || now >= until) return null;
  return until - now;
}
