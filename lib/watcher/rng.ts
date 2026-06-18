/** Fast mulberry32 PRNG — deterministic when seeded, chaotic when mixed with time. */
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function pickMany<T>(rng: () => number, items: readonly T[], count: number): T[] {
  if (items.length === 0 || count <= 0) return [];
  const copy = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return result;
}

export function chance(rng: () => number, probability: number) {
  return rng() < probability;
}

export function intBetween(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function createWatcherRng(salt = 0) {
  const seed =
    (Date.now() ^ (salt * 2654435761)) +
    Math.floor(Math.random() * 0x7fffffff);
  return mulberry32(seed >>> 0);
}
