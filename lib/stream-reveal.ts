export type StreamRevealOptions = {
  intervalMs?: number;
  onUpdate: (visibleText: string, targetText: string) => void;
};

/** Reveals streamed AI text gradually on the client (ChatGPT-style). */
export function createStreamReveal(options: StreamRevealOptions) {
  let targetText = "";
  let visibleText = "";
  let timer: number | null = null;
  const intervalMs = options.intervalMs ?? 34;

  function stop() {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function tick() {
    if (visibleText.length >= targetText.length) {
      stop();
      return;
    }

    const rest = targetText.slice(visibleText.length);
    const word = rest.match(/^(\s*\S+\s?|\s+)/);
    visibleText += word?.[1] ?? rest.charAt(0);
    options.onUpdate(visibleText, targetText);
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
    },
    flush() {
      stop();
      visibleText = targetText;
      options.onUpdate(visibleText, targetText);
    },
    dispose() {
      stop();
    }
  };
}
