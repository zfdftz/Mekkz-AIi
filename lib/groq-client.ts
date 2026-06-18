import { sleep } from "@/lib/plans";

export function parseGroqRetryDelayMs(errorText: string): number | null {
  const secondsMatch = errorText.match(/try again in ([\d.]+)s/i);
  if (secondsMatch) {
    return Math.ceil(Number.parseFloat(secondsMatch[1]) * 1000) + 250;
  }

  try {
    const json = JSON.parse(errorText) as {
      error?: { retry_after?: number; message?: string };
    };
    if (typeof json.error?.retry_after === "number" && json.error.retry_after > 0) {
      return Math.ceil(json.error.retry_after * 1000) + 250;
    }
  } catch {
    // Plain-text Groq errors are common.
  }

  return null;
}

export function formatGroqUserError(errorText: string, vision = false): string {
  if (/rate limit|tokens per minute|tpm|rpm|429/i.test(errorText)) {
    return "Gerade zu viele Anfragen — bitte kurz warten und erneut senden.";
  }
  if (vision) {
    return `Bild-Analyse fehlgeschlagen. Bitte erneut versuchen.`;
  }
  return "KI kurz nicht erreichbar — bitte in ein paar Sekunden erneut senden.";
}

export async function groqChatCompletion(
  payload: Record<string, unknown>,
  options?: { vision?: boolean; maxRetries?: number; timeoutMs?: number }
): Promise<Response> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY fehlt.");
  }

  const maxRetries = options?.maxRetries ?? 3;
  const timeoutMs = options?.timeoutMs ?? 12000;
  const body = JSON.stringify(payload);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body,
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (res.ok) return res;

    const errorText = await res.text();
    if (res.status === 429 && attempt < maxRetries) {
      const waitMs = parseGroqRetryDelayMs(errorText) ?? 1200 * (attempt + 1);
      await sleep(Math.min(waitMs, 10_000));
      continue;
    }

    throw new Error(formatGroqUserError(errorText, options?.vision));
  }

  throw new Error(formatGroqUserError("", options?.vision));
}
