import OpenAI from "openai";
import { extractImagePrompt, wantsImageGeneration } from "./image-intent";

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

async function generateOllamaImage(prompt: string) {
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

async function generatePollinationsImage(prompt: string) {
  const baseUrl = process.env.POLLINATIONS_BASE_URL || "https://image.pollinations.ai";
  const model = process.env.POLLINATIONS_IMAGE_MODEL || "turbo";
  const apiKey = process.env.POLLINATIONS_API_KEY;

  const params = new URLSearchParams({
    width: "768",
    height: "768",
    model,
    seed: String(Math.floor(Math.random() * 1_000_000_000))
  });
  if (apiKey) params.set("key", apiKey);

  const imageUrl = `${baseUrl}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

  const res = await fetch(imageUrl, {
    signal: AbortSignal.timeout(120000),
    headers: { "User-Agent": "mekkz-ai/1.0" }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Kostenlose Bild-Erstellung fehlgeschlagen: ${errorText.slice(0, 180)}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("image")) {
    throw new Error("Kostenlose Bild-Erstellung lieferte kein g├╝ltiges Bild.");
  }

  return {
    image: imageUrl,
    model,
    provider: "pollinations" as const
  };
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
) {
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
      "OpenAI Guthaben/Limit erreicht. Gehe zu platform.openai.com ÔåÆ Settings ÔåÆ Billing " +
      "und erh├Âhe dein Limit oder lade Guthaben auf. Bilder kosten extra."
    );
  }

  return message;
}

async function generateOpenAIImage(prompt: string) {
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

  throw lastError ?? new Error("Kein OpenAI Bild-Modell auf deinem Account verf├╝gbar.");
}

export async function generateImage(prompt: string) {
  const provider = process.env.IMAGE_PROVIDER || "pollinations";

  if (provider === "pollinations" || provider === "free") {
    return generatePollinationsImage(prompt);
  }

  if (provider === "openai") {
    return generateOpenAIImage(prompt);
  }

  if (provider === "ollama") {
    return generateOllamaImage(prompt);
  }

  try {
    return await generatePollinationsImage(prompt);
  } catch {
    try {
      return await generateOllamaImage(prompt);
    } catch (ollamaError) {
      if (process.env.OPENAI_API_KEY) {
        try {
          return await generateOpenAIImage(prompt);
        } catch {
          throw ollamaError;
        }
      }
      throw ollamaError;
    }
  }
}
