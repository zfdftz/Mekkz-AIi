import type { ImageGenResult } from "./image-gen";

type WorkerResponse = {
  image?: string;
  imageUrl?: string;
  model?: string;
  error?: string;
};

async function readImageFromUrl(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(55000) });
  if (!res.ok) {
    throw new Error(`Worker-Bild-URL fehlgeschlagen (${res.status}).`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength < 500) {
    throw new Error("Worker lieferte ein leeres Bild.");
  }
  return buffer.toString("base64");
}

function normalizeWorkerUrl(raw: string) {
  const base = raw.replace(/\/+$/, "");
  return base.endsWith("/generate") ? base : `${base}/generate`;
}

function formatWorkerError(message: string) {
  if (/fetch failed|econnrefused|enotfound|network|timeout|timed out/i.test(message)) {
    return (
      "Dein Bild-Server ist nicht erreichbar. Starte auf dem PC: `npm run image-worker` " +
      "(Ollama muss laufen). Für mekkzai.com: Tunnel (ngrok) oder VPS und MEKKZ_IMAGE_WORKER_URL in Vercel."
    );
  }
  if (/unauthorized|401/i.test(message)) {
    return "Bild-Server: MEKKZ_IMAGE_WORKER_SECRET stimmt nicht überein.";
  }
  if (/not found|does not exist|ollama/i.test(message)) {
    return (
      "Ollama-Bildmodell fehlt auf dem Server. Installieren: " +
      "`ollama pull x/flux2-klein:4b-fp8`"
    );
  }
  return `Eigene Bild-Erstellung fehlgeschlagen: ${message.slice(0, 180)}`;
}

/** Eigener Bild-Server (GPU/VPS) — siehe workers/mekkz-image-server.mjs */
export async function generateViaMekkzWorker(
  prompt: string
): Promise<{ result: ImageGenResult | null; error: string | null }> {
  const workerUrlRaw = process.env.MEKKZ_IMAGE_WORKER_URL?.trim();
  if (!workerUrlRaw) return { result: null, error: null };

  const workerUrl = normalizeWorkerUrl(workerUrlRaw);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "mekkz-ai/1.0"
  };

  const secret = process.env.MEKKZ_IMAGE_WORKER_SECRET?.trim();
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        width: 768,
        height: 768,
        model: "flux"
      }),
      signal: AbortSignal.timeout(58000)
    });

    const data = (await res.json()) as WorkerResponse;

    if (!res.ok) {
      throw new Error(data.error || `MEKKZ Worker HTTP ${res.status}`);
    }

    let image = data.image;
    if (!image && data.imageUrl) {
      image = await readImageFromUrl(data.imageUrl);
    }

    if (!image) {
      throw new Error("MEKKZ Worker lieferte kein Bild.");
    }

    return {
      result: {
        image,
        model: data.model || "flux",
        provider: "mekkz" as const
      },
      error: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { result: null, error: formatWorkerError(message) };
  }
}

export function mekkzWorkerConfigured() {
  return Boolean(process.env.MEKKZ_IMAGE_WORKER_URL?.trim());
}
