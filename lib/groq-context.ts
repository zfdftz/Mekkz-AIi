import { sleep } from "@/lib/plans";

function parseEnvInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function truncateForGroq(text: string, maxChars: number) {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function isGroqNoiseMessage(content: string) {
  const text = content.trim();
  return (
    /^Fehler:/i.test(text) ||
    /Groq API Fehler/i.test(text) ||
    /Rate limit reached/i.test(text) ||
    /tokens per minute/i.test(text) ||
    /Kurz überlastet/i.test(text)
  );
}

export function compactGroqSystemPrompt(systemText: string) {
  const max = parseEnvInt("GROQ_MAX_SYSTEM_CHARS", 2200);
  const trimmed = systemText.trim();
  if (trimmed.length <= max) return trimmed;

  const headSize = Math.floor(max * 0.58);
  const tailSize = Math.floor(max * 0.32);
  return `${trimmed.slice(0, headSize)}\n…\n${trimmed.slice(-tailSize)}`;
}

export function formatGroqApiError(errorText: string) {
  if (/rate limit|tokens per minute|tpm|rpm|429/i.test(errorText)) {
    return "Kurz überlastet — bitte 10 Sekunden warten und erneut senden.";
  }
  return "KI kurz nicht erreichbar — bitte erneut versuchen.";
}

export function formatChatErrorForUser(raw: string) {
  if (/rate limit|tokens per minute|Groq API|tpm|rpm|429/i.test(raw)) {
    return formatGroqApiError(raw);
  }
  return truncateForGroq(raw.replace(/^Fehler:\s*/i, ""), 220);
}

function parseGroqRetryMs(errorText: string) {
  const match = errorText.match(/try again in ([\d.]+)s/i);
  if (match) return Math.ceil(Number.parseFloat(match[1]) * 1000) + 400;
  return 2800;
}

function groqModels() {
  const primary = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const fallback = process.env.GROQ_FALLBACK_MODEL || "llama-3.3-70b-versatile";
  return [...new Set([primary, fallback, "gemma2-9b-it"])];
}

export async function requestGroqChatCompletion(
  body: Record<string, unknown>,
  options?: { stream?: boolean; timeoutMs?: number; models?: string[] }
) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY fehlt.");
  }

  const stream = options?.stream ?? false;
  const timeoutMs = options?.timeoutMs ?? 12000;
  const models = options?.models?.length ? options.models : groqModels();
  let lastError = "";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({ ...body, model, stream }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (res.ok) return res;

      lastError = await res.text();
      if (res.status === 429) {
        if (attempt === 0) {
          await sleep(Math.min(parseGroqRetryMs(lastError), 9000));
          continue;
        }
        break;
      }

      throw new Error(formatGroqApiError(lastError));
    }
  }

  throw new Error(formatGroqApiError(lastError));
}

export function shouldFallbackFromGroqToOpenAI(error: unknown) {
  if (!process.env.OPENAI_API_KEY) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /rate limit|tokens per minute|tpm|rpm|429|überlastet|nicht erreichbar|groq api|timeout|timed out|503|502/i.test(
    message
  );
}

export function groqLeanChatEnabled(hasImageInLastMessage: boolean) {
  if (hasImageInLastMessage) return false;
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "groq") return Boolean(process.env.GROQ_API_KEY);
  if (provider === "openai" && !process.env.OPENAI_API_KEY && process.env.GROQ_API_KEY) {
    return true;
  }
  return false;
}
