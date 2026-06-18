type WatcherSoundKind = "whisper" | "crackle" | "hum";

const DEFAULT_VOLUME = 0.2;

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => undefined);
  }
  return sharedCtx;
}

function prefersQuiet(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  } catch {
    // Ignore.
  }
  return false;
}

function masterGain(ctx: AudioContext, volume: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  return gain;
}

function playWhisper(ctx: AudioContext, out: GainNode, when: number) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.35);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.4;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900 + Math.random() * 400;
  filter.Q.value = 2.5;
  src.connect(filter);
  filter.connect(out);
  src.start(when);
  src.stop(when + 0.4);
}

function playCrackle(ctx: AudioContext, out: GainNode, when: number) {
  const bursts = 3 + Math.floor(Math.random() * 3);
  for (let b = 0; b < bursts; b++) {
    const start = when + b * 0.04 + Math.random() * 0.02;
    const len = Math.floor(ctx.sampleRate * (0.02 + Math.random() * 0.03));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.15 + Math.random() * 0.1;
    src.connect(gain);
    gain.connect(out);
    src.start(start);
    src.stop(start + len / ctx.sampleRate);
  }
}

function playHum(ctx: AudioContext, out: GainNode, when: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(55 + Math.random() * 20, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.5);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.35, when + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
  osc.connect(gain);
  gain.connect(out);
  osc.start(when);
  osc.stop(when + 0.6);
}

const SOUND_PLAYERS: Record<WatcherSoundKind, (ctx: AudioContext, out: GainNode, when: number) => void> = {
  whisper: playWhisper,
  crackle: playCrackle,
  hum: playHum
};

const SOUND_KINDS: WatcherSoundKind[] = ["whisper", "crackle", "hum"];

export function playWatcherSound(options?: { volume?: number; kind?: WatcherSoundKind }) {
  if (prefersQuiet()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const volume = Math.min(0.25, Math.max(0.1, options?.volume ?? DEFAULT_VOLUME));
  const kind = options?.kind ?? SOUND_KINDS[Math.floor(Math.random() * SOUND_KINDS.length)]!;
  const out = masterGain(ctx, volume);
  const when = ctx.currentTime + 0.01;
  SOUND_PLAYERS[kind](ctx, out, when);
}
