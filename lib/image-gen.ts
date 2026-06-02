import OpenAI from "openai";

const IMAGE_VERB_PATTERN =
  /\b(erstell(?:e|en)|generier(?:e|en)|zeichn(?:e|en)|mal(?:e|en)|erzeuge|mach(?:e|en)?|mache|create|generate|draw|paint|design(?:e|en)?)\b.{0,32}\b(bild|foto|image|picture|photo|zeichnung)\b/i;

const IMAGE_NOUN_FIRST_PATTERN =
  /\b(bild|foto|zeichnung)\s+(von|vom|über|ueber|mit|eines?|einer?|am|im|der|die|das)\b/i;

const IMAGE_WANT_PATTERN =
  /\b(will|würde|wuerde|brauch(?:e|en)?|möchte|moechte|hätte|haette|kannst du|könntest du|koenntest du|bitte).{0,45}\b(bild|foto|zeichnung)\b/i;

const IMAGE_SHORT_PATTERN = /\b(mach\s+bild|bild\s+machen|bild\s+erstellen|foto\s+machen)\b/i;

export function wantsImageGeneration(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^\/(?:bild|image|img)\s+.+/i.test(trimmed)) return true;

  return (
    IMAGE_VERB_PATTERN.test(trimmed) ||
    IMAGE_NOUN_FIRST_PATTERN.test(trimmed) ||
    IMAGE_WANT_PATTERN.test(trimmed) ||
    IMAGE_SHORT_PATTERN.test(trimmed)
  );
}

export function extractImagePrompt(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("/bild ")) return trimmed.slice(6).trim();
  if (trimmed.startsWith("/image ")) return trimmed.slice(7).trim();
  if (trimmed.startsWith("/img ")) return trimmed.slice(5).trim();

  const cleaned = trimmed
    .replace(
      /^(bitte\s+)?(erstell(?:e|en)|generier(?:e|en)|zeichn(?:e|en)|mal(?:e|en)|erzeuge|mach(?:e|en)?|mache|create|generate|draw|paint|design(?:e|en)?)\s+(mir\s+)?(ein\s+|a\s+|an\s+)?(bild|foto|image|picture|photo|zeichnung)\s*(von|vom|of|:|–|-)?\s*/i,
      ""
    )
    .replace(
      /^(bitte\s+)?(will|würde|wuerde|brauch(?:e|en)?|möchte|moechte|hätte|haette)\s+(mir\s+)?(ein\s+)?(bild|foto|zeichnung)\s*(von|vom|mit|:|–|-)?\s*/i,
      ""
    )
    .replace(
      /^(bitte\s+)?(kannst du|könntest du|koenntest du)\s+(mir\s+)?(ein\s+)?(bild|foto|zeichnung)\s*(von|vom|:|–|-)?\s*/i,
      ""
    )
    .replace(/^(bild|foto|zeichnung)\s+(von|vom|über|ueber|mit)\s*/i, "")
    .replace(/^(mach\s+bild|bild\s+machen|bild\s+erstellen|foto\s+machen)\s*(von|vom|:|–|-)?\s*/i, "")
    .trim();

  return cleaned || trimmed;
}

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
    throw new Error("Kostenlose Bild-Erstellung lieferte kein gültiges Bild.");
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
      "OpenAI Guthaben/Limit erreicht. Gehe zu platform.openai.com → Settings → Billing " +
      "und erhöhe dein Limit oder lade Guthaben auf. Bilder kosten extra."
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

  throw lastError ?? new Error("Kein OpenAI Bild-Modell auf deinem Account verfügbar.");
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
