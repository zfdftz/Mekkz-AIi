import OpenAI from "openai";
import { extractImagePrompt, wantsImageGeneration } from "./image-intent";
import { sleep } from "./plans";
import {
  generateViaMekkzWorker,
  mekkzWorkerConfigured
} from "./mekkz-image-worker";
import {
  buildAnonymousGenImageUrl,
  buildAuthenticatedGenImageUrl,
  buildPollinationsImageUrl as buildLegacyPollinationsUrl,
  buildPollinationsImageProxyPath,
  normalizePollinationsModel
} from "./pollinations-url";

export { extractImagePrompt, wantsImageGeneration };

function isMemoryError(message: string) {
  return /gib|memory|vram|insufficient|cuda|shared object/i.test(message);
}

function isMissingModelError(message: string) {
  return /not found|does not exist/i.test(message);
}

function shouldUseOpenAIFallback(message: string) {
  return isMemoryError(message) || isMissingModelError(message);
}

function isPollinationsQuotaError(message: string, status?: number) {
  return (
    status === 402 ||
    /402|payment required|insufficient balance|pollen|quota|credit|not enough|wallet/i.test(
      message
    )
  );
}

function isPollinationsCapacityError(message: string) {
  return /queue full|x402version|x402|401|402|unauthorized|payment required|insufficient balance|too many requests|rate limit|429|503|502|504|timeout|timed out|fetch failed|econnreset|network/i.test(
    message
  );
}

function formatPollinationsError(raw: string, status?: number) {
  const text = raw.trim() || (status ? `HTTP ${status}` : "Unbekannter Fehler");

  if (/402|payment required|insufficient balance|pollen|quota|credit/i.test(text)) {
    return "Pollinations-Guthaben ist aufgebraucht. Auf enter.pollinations.ai prüfen oder später erneut versuchen.";
  }

  if (/401|unauthorized|invalid.*key|invalid.*token/i.test(text)) {
    return "Pollinations API-Key ungültig. Neuen Key auf enter.pollinations.ai erstellen und in Vercel speichern.";
  }

  if (isPollinationsCapacityError(text) || (status != null && status >= 500)) {
    return "Pollinations ist gerade überlastet. Bitte in 20–30 Sekunden erneut versuchen.";
  }

  return `Bild-Erstellung fehlgeschlagen: ${text.slice(0, 180)}`;
}

export type ImageGenResult = {
  image: string;
  model: string;
  provider: "pollinations" | "openai" | "ollama" | "mekkz";
  /** Bild wird im Browser geladen (gratis, keine Vercel-Warteschlange). */
  clientDirect?: boolean;
};

function shouldUseClientDirectPollinations() {
  if (process.env.POLLINATIONS_CLIENT_DIRECT === "false") return false;
  const provider = (process.env.IMAGE_PROVIDER || "").trim().toLowerCase();
  if (provider === "free" || provider === "gratis" || provider === "kostenlos") return true;
  if (!process.env.VERCEL) return false;
  if (process.env.POLLINATIONS_API_KEY) return false;
  return true;
}

export { normalizePollinationsModel } from "./pollinations-url";

export function buildPollinationsImageUrl(prompt: string, useLegacy = true) {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  const envModel = process.env.POLLINATIONS_IMAGE_MODEL;
  const model = normalizePollinationsModel(envModel) as "turbo" | "flux" | "flux-realism";

  if (useLegacy) {
    const params = new URLSearchParams({
      width: "768",
      height: "768",
      model,
      seed: String(Math.floor(Math.random() * 1_000_000_000)),
      nologo: "true"
    });
    if (apiKey) params.set("key", apiKey);
    return `${process.env.POLLINATIONS_LEGACY_BASE_URL || "https://image.pollinations.ai"}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
  }

  const genModel = model === "turbo" ? "flux" : model;
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    model: genModel,
    seed: String(Math.floor(Math.random() * 1_000_000_000))
  });
  if (apiKey) params.set("key", apiKey);
  return `${process.env.POLLINATIONS_BASE_URL || "https://gen.pollinations.ai"}/image/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export function buildInlinePollinationsImagePath(prompt: string) {
  const params = new URLSearchParams({ prompt });
  return `/api/pollinations-image?${params.toString()}`;
}

async function requestPollinationsImageBase64(
  prompt: string,
  options: { authenticated: boolean; maxAttempts?: number }
): Promise<{ result: ImageGenResult | null; error: string | null; quotaBlocked?: boolean }> {
  const model = normalizePollinationsModel(process.env.POLLINATIONS_IMAGE_MODEL);
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  const maxAttempts = options.maxAttempts ?? 3;

  if (options.authenticated && !apiKey) {
    return { result: null, error: null };
  }

  const headers: Record<string, string> = { "User-Agent": "mekkz-ai/1.0" };
  if (options.authenticated && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let lastError: string | null = null;
  let quotaBlocked = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const imageUrl = options.authenticated
      ? buildAuthenticatedGenImageUrl(
          prompt,
          "flux",
          Math.floor(Math.random() * 2_147_483_647)
        )
      : buildAnonymousGenImageUrl(prompt, Math.floor(Math.random() * 2_147_483_647));

    try {
      const res = await fetch(imageUrl, {
        headers,
        signal: AbortSignal.timeout(55000)
      });

      if (!res.ok) {
        const errorText = await res.text();
        lastError = formatPollinationsError(errorText, res.status);
        if (isPollinationsQuotaError(errorText, res.status)) {
          quotaBlocked = true;
        }
        const retryable =
          !quotaBlocked &&
          (isPollinationsCapacityError(errorText) ||
            res.status === 429 ||
            res.status >= 500);
        if (retryable && attempt < maxAttempts) {
          await sleep(2500 * attempt);
          continue;
        }
        return { result: null, error: lastError, quotaBlocked };
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("image")) {
        const body = await res.text();
        lastError = formatPollinationsError(body, res.status);
        if (isPollinationsQuotaError(body, res.status)) {
          quotaBlocked = true;
        }
        if (attempt < maxAttempts && !quotaBlocked) {
          await sleep(2500 * attempt);
          continue;
        }
        return { result: null, error: lastError, quotaBlocked };
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength < 500) {
        lastError = "Pollinations lieferte ein leeres Bild.";
        if (attempt < maxAttempts) {
          await sleep(2500 * attempt);
          continue;
        }
        return { result: null, error: lastError, quotaBlocked };
      }

      return {
        result: {
          image: buffer.toString("base64"),
          model,
          provider: "pollinations"
        },
        error: null,
        quotaBlocked: false
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = formatPollinationsError(message);
      if (attempt < maxAttempts) {
        await sleep(2500 * attempt);
        continue;
      }
    }
  }

  return { result: null, error: lastError, quotaBlocked };
}

async function fetchPollinationsImageBase64(
  prompt: string,
  maxAttempts = 3
): Promise<{ result: ImageGenResult | null; error: string | null }> {
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();

  if (apiKey) {
    const authed = await requestPollinationsImageBase64(prompt, {
      authenticated: true,
      maxAttempts
    });
    if (authed.result) return { result: authed.result, error: null };

    const anon = await requestPollinationsImageBase64(prompt, {
      authenticated: false,
      maxAttempts: 2
    });
    if (anon.result) return { result: anon.result, error: null };

    return { result: null, error: anon.error ?? authed.error };
  }

  return requestPollinationsImageBase64(prompt, {
    authenticated: false,
    maxAttempts
  });
}

/** Sofortige Bild-URL — lädt im Browser des Nutzers (kein Server-Timeout auf Vercel). */
export function createBrowserImageGeneration(prompt: string): ImageGenResult {
  const model = normalizePollinationsModel(process.env.POLLINATIONS_IMAGE_MODEL);
  return {
    image: buildLegacyPollinationsUrl(prompt, "flux"),
    model,
    provider: "pollinations",
    clientDirect: true
  };
}

async function unloadOllamaModels() {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

  try {
    const psRes = await fetch(`${baseUrl}/api/ps`);
    if (!psRes.ok) return;
    const psData = (await psRes.json()) as { models?: { name: string }[] };

    for (const model of psData.models ?? []) {
      await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.name,
          prompt: ".",
          stream: false,
          keep_alive: 0
        })
      });
    }
  } catch {
    // Best effort only.
  }
}

async function generateOllamaImage(prompt: string): Promise<ImageGenResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_IMAGE_MODEL || "x/flux2-klein:4b-fp8";

  await unloadOllamaModels();

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      width: 512,
      height: 512
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (isMemoryError(errorText) || isMissingModelError(errorText)) {
      throw new Error(errorText);
    }
    throw new Error(`Bild-Erstellung fehlgeschlagen: ${errorText}`);
  }

  const data = (await res.json()) as { image?: string };
  if (!data.image) {
    throw new Error(`Kein Bild von Ollama erhalten (Modell: ${model}).`);
  }

  return { image: data.image, model, provider: "ollama" as const };
}

async function fetchPollinationsImageResponse(prompt: string, useLegacy: boolean) {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  const model = normalizePollinationsModel(process.env.POLLINATIONS_IMAGE_MODEL);
  const seed = String(Math.floor(Math.random() * 1_000_000_000));

  const params = new URLSearchParams({
    width: "768",
    height: "768",
    model,
    seed
  });
  if (apiKey) params.set("key", apiKey);

  const headers: Record<string, string> = { "User-Agent": "mekkz-ai/1.0" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const imageUrl = useLegacy
    ? `${process.env.POLLINATIONS_LEGACY_BASE_URL || "https://image.pollinations.ai"}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`
    : `${process.env.POLLINATIONS_BASE_URL || "https://gen.pollinations.ai"}/image/${encodeURIComponent(prompt)}?${params.toString()}`;

  return fetch(imageUrl, {
    signal: AbortSignal.timeout(120000),
    headers
  });
}

async function generatePollinationsImage(prompt: string): Promise<ImageGenResult> {
  if (shouldUseClientDirectPollinations()) {
    return createBrowserImageGeneration(prompt);
  }

  const apiKey = process.env.POLLINATIONS_API_KEY;
  const model = normalizePollinationsModel(process.env.POLLINATIONS_IMAGE_MODEL);

  const attempts: boolean[] = apiKey ? [false, true] : [false];

  let lastError = "Bild-Erstellung fehlgeschlagen.";

  for (const useLegacy of attempts) {
    const res = await fetchPollinationsImageResponse(prompt, useLegacy);

    if (!res.ok) {
      const errorText = await res.text();
      lastError = formatPollinationsError(errorText, res.status);
      if (isPollinationsCapacityError(errorText)) continue;
      throw new Error(lastError);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      const body = await res.text();
      lastError = formatPollinationsError(body, res.status);
      if (isPollinationsCapacityError(body)) continue;
      throw new Error("Bild-Erstellung lieferte kein gültiges Bild.");
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 500) {
      throw new Error("Bild-Erstellung lieferte ein leeres Bild.");
    }

    return {
      image: buffer.toString("base64"),
      model,
      provider: "pollinations" as const
    };
  }

  throw new Error(lastError);
}

async function urlToBase64(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("OpenAI Bild-URL konnte nicht geladen werden.");
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

async function generateOpenAIImageWithModel(
  openai: OpenAI,
  model: string,
  prompt: string
): Promise<ImageGenResult> {
  const isGptImage = model.startsWith("gpt-image");

  const result = await openai.images.generate({
    model,
    prompt,
    size: "1024x1024",
    n: 1,
    ...(isGptImage ? { quality: "medium" } : {})
  });

  const item = result.data?.[0];
  if (item?.b64_json) {
    return { image: item.b64_json, model, provider: "openai" as const };
  }

  if (item?.url) {
    const image = await urlToBase64(item.url);
    return { image, model, provider: "openai" as const };
  }

  throw new Error("OpenAI hat kein Bild geliefert.");
}

function isUnavailableOpenAIModelError(message: string) {
  return /does not exist|model_not_found|invalid model|not available/i.test(message);
}

function formatOpenAIError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/billing hard limit|insufficient_quota|exceeded your current quota|payment/i.test(message)) {
    return (
      "OpenAI Guthaben/Limit erreicht. Gehe zu platform.openai.com → Settings → Billing " +
      "und erhöhe dein Limit oder lade Guthaben auf. Bilder kosten extra."
    );
  }

  return message;
}

async function generateOpenAIImage(prompt: string): Promise<ImageGenResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Lokale Bild-Erstellung braucht zu viel Speicher. OPENAI_API_KEY fehlt als Alternative."
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const preferred = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const fallbacks = ["gpt-image-1", "dall-e-2", "dall-e-3"];
  const models = [preferred, ...fallbacks.filter((model) => model !== preferred)];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await generateOpenAIImageWithModel(openai, model, prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isUnavailableOpenAIModelError(message)) {
        lastError = error instanceof Error ? error : new Error(message);
        continue;
      }
      throw new Error(formatOpenAIError(error));
    }
  }

  throw lastError ?? new Error("Kein OpenAI Bild-Modell auf deinem Account verfügbar.");
}

function isOpenAIQuotaError(message: string) {
  return /billing hard limit|insufficient_quota|exceeded your current quota|Guthaben|Limit erreicht|payment|429|quota/i.test(
    message
  );
}

type ImageProviderMode = "mekkz" | "ollama" | "pollinations" | "openai" | "free";

function mekkzWorkerSetupError() {
  return (
    "Eigener Bild-Server offline. Windows: Stable Diffusion WebUI installieren und `npm run bild-server`. " +
    "Oder IMAGE_PROVIDER=free in Vercel (kostenlos, lädt im Browser)."
  );
}

function formatOllamaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (isMissingModelError(message)) {
    const model = process.env.OLLAMA_IMAGE_MODEL || "x/flux2-klein:4b-fp8";
    return `Ollama-Bildmodell fehlt. Installieren: \`ollama pull ${model}\``;
  }
  if (isMemoryError(message)) {
    return "Nicht genug GPU/RAM für Bild-Erstellung. Kleineres Modell oder nur Text nutzen.";
  }
  if (/fetch failed|econnrefused|enotfound/i.test(message)) {
    return "Ollama läuft nicht. Starte die Ollama-App oder `ollama serve`.";
  }
  return `Bild-Erstellung fehlgeschlagen: ${message.slice(0, 180)}`;
}

function resolveImageProvider(): ImageProviderMode {
  const raw = (process.env.IMAGE_PROVIDER || "").trim().toLowerCase();

  if (raw === "free" || raw === "gratis" || raw === "kostenlos") return "free";
  if (raw === "pollinations") return "pollinations";
  if (raw === "openai") return "openai";
  if (raw === "mekkz" || raw === "self" || raw === "own") return "mekkz";

  if (process.env.VERCEL) {
    if (mekkzWorkerConfigured()) return "mekkz";
    return "free";
  }

  if (raw === "ollama") return "ollama";
  return "ollama";
}

function prefersSelfHosted(provider: ImageProviderMode) {
  return provider === "mekkz" || provider === "ollama";
}

async function tryOpenAIImage(prompt: string): Promise<ImageGenResult | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    return await generateOpenAIImage(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isOpenAIQuotaError(message)) return null;
    throw error instanceof Error ? error : new Error(message);
  }
}

async function tryPollinationsImage(prompt: string): Promise<ImageGenResult | null> {
  try {
    return await generatePollinationsImage(prompt);
  } catch (pollinationsError) {
    const message =
      pollinationsError instanceof Error ? pollinationsError.message : String(pollinationsError);
    if (!isPollinationsCapacityError(message)) throw pollinationsError;
    return null;
  }
}

/** Bild über eigene API (Pollinations-Key bleibt auf dem Server). */
export function createProxyImageGeneration(prompt: string): ImageGenResult {
  const model = normalizePollinationsModel(process.env.POLLINATIONS_IMAGE_MODEL);
  return {
    image: buildPollinationsImageProxyPath(prompt),
    model,
    provider: "pollinations",
    clientDirect: true
  };
}

async function tryOllamaImage(prompt: string): Promise<ImageGenResult | null> {
  if (process.env.VERCEL) return null;
  try {
    return await generateOllamaImage(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (shouldUseOpenAIFallback(message)) return null;
    throw new Error(formatOllamaError(error));
  }
}

async function tryPollinationsFallback(prompt: string): Promise<ImageGenResult> {
  if (process.env.VERCEL) {
    let lastError =
      "Bild-Erstellung fehlgeschlagen. Bitte in 20–30 Sekunden erneut versuchen.";

    if (process.env.POLLINATIONS_API_KEY) {
      const primary = await fetchPollinationsImageBase64(prompt, 3);
      if (primary.result) return primary.result;
      if (primary.error) lastError = primary.error;

      const pollResult = await tryPollinationsImage(prompt);
      if (pollResult) return pollResult;

      throw new Error(lastError);
    }

    const pollResult = await tryPollinationsImage(prompt);
    if (pollResult) return pollResult;

    throw new Error(
      "Pollinations-Key fehlt in Vercel. enter.pollinations.ai → Secret Key → POLLINATIONS_API_KEY speichern → Redeploy."
    );
  }

  const primary = await fetchPollinationsImageBase64(prompt, 2);
  if (primary.result) return primary.result;

  const pollResult = await tryPollinationsImage(prompt);
  if (pollResult) return pollResult;

  const openaiResult = await tryOpenAIImage(prompt);
  if (openaiResult) return openaiResult;

  return createBrowserImageGeneration(prompt);
}

async function fetchLegacyPollinationsBase64(
  prompt: string
): Promise<ImageGenResult | null> {
  const imageUrl = buildLegacyPollinationsUrl(
    prompt,
    "flux",
    Math.floor(Math.random() * 2_147_483_647)
  );

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "mekkz-ai/1.0" },
      signal: AbortSignal.timeout(55000)
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("image")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 500) return null;

    return {
      image: buffer.toString("base64"),
      model: "flux",
      provider: "pollinations"
    };
  } catch {
    return null;
  }
}

async function generateFreeImage(prompt: string): Promise<ImageGenResult> {
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();

  if (apiKey) {
    const authed = await fetchPollinationsImageBase64(prompt, 3);
    if (authed.result) return authed.result;
  }

  const legacy = await fetchLegacyPollinationsBase64(prompt);
  if (legacy) return legacy;

  const anon = await fetchPollinationsImageBase64(prompt, 2);
  if (anon.result) return anon.result;

  return createProxyImageGeneration(prompt);
}

export async function generateImage(prompt: string): Promise<ImageGenResult> {
  const provider = resolveImageProvider();

  if (provider === "free") {
    return generateFreeImage(prompt);
  }

  const selfHosted = prefersSelfHosted(provider);

  if (mekkzWorkerConfigured()) {
    const worker = await generateViaMekkzWorker(prompt);
    if (worker.result) return worker.result;
    if (selfHosted) {
      throw new Error(worker.error || mekkzWorkerSetupError());
    }
  } else if (process.env.VERCEL && selfHosted) {
    throw new Error(mekkzWorkerSetupError());
  }

  if (!process.env.VERCEL) {
    const ollamaResult = await tryOllamaImage(prompt);
    if (ollamaResult) return ollamaResult;
    if (provider === "ollama" || provider === "mekkz") {
      return createBrowserImageGeneration(prompt);
    }
  }

  if (provider === "pollinations" || provider === "openai") {
    if (provider === "openai") {
      const openaiResult = await tryOpenAIImage(prompt);
      if (openaiResult) return openaiResult;
    }
    return tryPollinationsFallback(prompt);
  }

  return createBrowserImageGeneration(prompt);
}
