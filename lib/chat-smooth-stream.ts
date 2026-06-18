export type SmoothStreamReveal = {
  reset: () => void;
  start: (onReveal: (visible: string) => void, onCaughtUp?: () => void) => void;
  setTarget: (text: string) => void;
  setFlushing: (flushing: boolean) => void;
  stop: (options?: { flush?: boolean }) => void;
  getVisible: () => string;
  getTarget: () => string;
};

export function createSmoothStreamReveal(options?: {
  baseCharsPerFrame?: number;
  maxCharsPerFrame?: number;
  msPerChar?: number;
}): SmoothStreamReveal {
  const baseChars = options?.baseCharsPerFrame ?? 2;
  const maxChars = options?.maxCharsPerFrame ?? 12;
  const msPerChar = options?.msPerChar ?? 20;

  let target = "";
  let visible = "";
  let rafId: number | null = null;
  let onReveal: ((text: string) => void) | null = null;
  let onCaughtUp: (() => void) | null = null;
  let flushing = false;
  let lastTime = 0;

  function tick(now: number) {
    if (!onReveal) return;

    const dt = lastTime ? now - lastTime : 16;
    lastTime = now;

    if (visible.length < target.length) {
      const backlog = target.length - visible.length;
      let step: number;

      if (flushing) {
        step = Math.max(1, Math.min(maxChars * 2, Math.ceil(backlog / 4)));
      } else {
        const timeBased = Math.max(1, Math.floor(dt / msPerChar));
        const backlogBased = Math.max(1, Math.min(maxChars, Math.ceil(backlog * 0.1)));
        step = Math.min(Math.max(timeBased, baseChars), backlogBased);
      }

      visible = target.slice(0, visible.length + step);
      onReveal(visible);
    }

    if (visible.length < target.length) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    rafId = null;
    lastTime = 0;
    flushing = false;
    onCaughtUp?.();
  }

  function ensureLoop() {
    if (rafId == null && onReveal && visible.length < target.length) {
      lastTime = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  return {
    reset() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      target = "";
      visible = "";
      flushing = false;
      lastTime = 0;
      onReveal = null;
      onCaughtUp = null;
    },
    start(callback, caughtUp) {
      onReveal = callback;
      onCaughtUp = caughtUp ?? null;
      ensureLoop();
    },
    setTarget(text) {
      target = text;
      if (visible.length >= target.length) {
        onCaughtUp?.();
        return;
      }
      ensureLoop();
    },
    setFlushing(value) {
      flushing = value;
      ensureLoop();
    },
    stop({ flush = false } = {}) {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTime = 0;
      flushing = false;
      if (flush && visible !== target) {
        visible = target;
        onReveal?.(visible);
      }
    },
    getVisible: () => visible,
    getTarget: () => target
  };
}
