export const POLLINATIONS_MODELS = ["flux"] as const;

/** gen.pollinations.ai akzeptiert aktuell vor allem „flux“. */
export function normalizePollinationsModel(raw?: string) {
  const model = (raw || "flux").trim().toLowerCase();
  if (model === "flux") return "flux";
  return "flux";
}

export type PollinationsModel = (typeof POLLINATIONS_MODELS)[number];

function pollinationsSeed(seed?: number) {
  const value = seed ?? Math.floor(Math.random() * 2_147_483_647);
  return String(Math.abs(value) % 2_147_483_647);
}

export function buildPollinationsImageUrl(
  prompt: string,
  model: PollinationsModel = "flux",
  seed?: number
) {
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    model: "flux",
    seed: pollinationsSeed(seed),
    nologo: "true"
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export function buildGenPollinationsImageUrl(
  prompt: string,
  model: PollinationsModel = "flux",
  seed?: number
) {
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    model: "flux",
    seed: pollinationsSeed(seed),
    nologo: "true"
  });

  return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export function buildPollinationsImageProxyPath(prompt: string) {
  return `/api/pollinations-image?${new URLSearchParams({ prompt }).toString()}`;
}

/** Nur Server — gen.pollinations.ai mit Secret Key. */
export function buildAuthenticatedGenImageUrl(
  prompt: string,
  model: PollinationsModel = "flux",
  seed?: number
) {
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    model: "flux",
    seed: pollinationsSeed(seed),
    nologo: "true"
  });
  const key = process.env.POLLINATIONS_API_KEY?.trim();
  if (key) params.set("key", key);

  return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params.toString()}`;
}

/** Öffentlicher Flux-Aufruf ohne Key (kostenlos, mit Rate-Limits). */
export function buildAnonymousGenImageUrl(prompt: string, seed?: number) {
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    model: "flux",
    seed: pollinationsSeed(seed),
    nologo: "true"
  });

  return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params.toString()}`;
}

/** Im Browser nur über unsere API (Key bleibt auf dem Server). */
export function buildPollinationsImageSources(prompt: string) {
  return [buildPollinationsImageProxyPath(prompt)];
}
