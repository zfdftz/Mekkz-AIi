import {
  buildAnonymousGenImageUrl,
  buildAuthenticatedGenImageUrl,
  buildPollinationsImageUrl,
  normalizePollinationsModel
} from "@/lib/pollinations-url";
import { sleep } from "@/lib/plans";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function formatError(raw: string, status?: number) {
  const text = raw.trim() || (status ? `HTTP ${status}` : "Unbekannter Fehler");
  if (/402|payment required|insufficient balance|pollen|quota|credit/i.test(text)) {
    return "Pollinations-Guthaben ist aufgebraucht.";
  }
  if (/401|unauthorized|invalid.*key/i.test(text)) {
    return "Pollinations API-Key ungültig. Neuen Key auf enter.pollinations.ai erstellen.";
  }
  if (/429|502|503|504|queue full|rate limit/i.test(text) || (status != null && status >= 500)) {
    return "Pollinations ist gerade überlastet. Bitte in 20–30 Sekunden erneut versuchen.";
  }
  return text.slice(0, 200);
}

function isQuotaError(raw: string, status?: number) {
  return status === 402 || /402|pollen|quota|insufficient balance|payment required/i.test(raw);
}

async function fetchImageFromUrl(
  imageUrl: string,
  headers: Record<string, string>
) {
  const res = await fetch(imageUrl, {
    headers,
    signal: AbortSignal.timeout(55000)
  });

  if (!res.ok) {
    const errorText = await res.text();
    return {
      ok: false as const,
      error: formatError(errorText, res.status),
      quota: isQuotaError(errorText, res.status),
      status: res.status
    };
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("image")) {
    const body = await res.text();
    return {
      ok: false as const,
      error: formatError(body, res.status),
      quota: isQuotaError(body, res.status),
      status: res.status
    };
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 500) {
    return {
      ok: false as const,
      error: "Leeres Bild erhalten.",
      quota: false,
      status: 502
    };
  }

  return { ok: true as const, buffer, contentType };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt")?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt fehlt." }, { status: 400 });
  }

  normalizePollinationsModel(process.env.POLLINATIONS_IMAGE_MODEL);
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  let lastError = "Bild konnte nicht geladen werden.";

  const attempts: { label: string; url: string; headers: Record<string, string> }[] = [];

  if (apiKey) {
    attempts.push({
      label: "auth",
      url: buildAuthenticatedGenImageUrl(prompt, "flux", Math.floor(Math.random() * 2_147_483_647)),
      headers: { "User-Agent": "mekkz-ai/1.0", Authorization: `Bearer ${apiKey}` }
    });
  }

  for (let i = 0; i < 3; i++) {
    attempts.push({
      label: "legacy",
      url: buildPollinationsImageUrl(
        prompt,
        "flux",
        Math.floor(Math.random() * 2_147_483_647)
      ),
      headers: { "User-Agent": "mekkz-ai/1.0" }
    });
    attempts.push({
      label: "anon",
      url: buildAnonymousGenImageUrl(prompt, Math.floor(Math.random() * 2_147_483_647)),
      headers: { "User-Agent": "mekkz-ai/1.0" }
    });
  }

  for (let attempt = 0; attempt < attempts.length; attempt++) {
    const entry = attempts[attempt];
    try {
      const result = await fetchImageFromUrl(entry.url, entry.headers);
      if (result.ok) {
        return new NextResponse(result.buffer, {
          headers: {
            "Content-Type": result.contentType,
            "Cache-Control": "public, max-age=86400"
          }
        });
      }

      lastError = result.error;
      if (entry.label === "auth" && result.quota) {
        continue;
      }
      if (result.status >= 500 || result.status === 429) {
        await sleep(2000 * ((attempt % 3) + 1));
      }
    } catch (error) {
      lastError = formatError(error instanceof Error ? error.message : lastError);
      await sleep(1500 * ((attempt % 3) + 1));
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
