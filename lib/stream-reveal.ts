export type StreamRevealOptions = {
  intervalMs?: number;
  onUpdate: (visibleText: string, targetText: string) => void;
  onIdle?: () => void;
};

/** Reveals streamed AI text gradually on the client (ChatGPT-style). */
export function createStreamReveal(options: StreamRevealOptions) {
  let targetText = "";
  let visibleText = "";
  let timer: number | null = null;
  const intervalMs = options.intervalMs ?? 24;

  function stop() {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function notifyIdle() {
    if (visibleText.length >= targetText.length) {
      stop();
      options.onIdle?.();
    }
  }

  function tick() {
    if (visibleText.length >= targetText.length) {
      notifyIdle();
      return;
    }

    const rest = targetText.slice(visibleText.length);
    const word = rest.match(/^(\s*\S+\s?|\s+)/);
    visibleText += word?.[1] ?? rest.charAt(0);
    options.onUpdate(visibleText, targetText);
    notifyIdle();
  }

  function ensureTimer() {
    if (timer != null || visibleText.length >= targetText.length) return;
    timer = window.setInterval(tick, intervalMs);
  }

  return {
    reset() {
      stop();
      targetText = "";
      visibleText = "";
    },
    setTarget(next: string) {
      targetText = next;
      ensureTimer();
      notifyIdle();
    },
    flush() {
      stop();
      visibleText = targetText;
      options.onUpdate(visibleText, targetText);
      options.onIdle?.();
    },
    isCaughtUp() {
      return visibleText.length >= targetText.length;
    },
    waitUntilCaughtUp() {
      if (visibleText.length >= targetText.length) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const previousIdle = options.onIdle;
        options.onIdle = () => {
          previousIdle?.();
          options.onIdle = previousIdle;
          resolve();
        };
        ensureTimer();
      });
    },
    dispose() {
      stop();
    }
  };
}
