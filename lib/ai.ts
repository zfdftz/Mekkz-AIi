import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage } from "./types";
import {
  DEFAULT_LANGUAGE,
  buildVisionFallbackPrompt,
  type LanguageCode
} from "./languages";

type AIProvider = "openai" | "claude" | "gemini";
type ExtendedAIProvider =
  | "openai"
  | "claude"
  | "gemini"
  | "groq"
  | "ollama";

function getSystemText(messages: ChatMessage[]) {
  return messages.find((m) => m.role === "system")?.content;
}

function getNonSystemMessages(messages: ChatMessage[]) {
  return messages.filter((m) => m.role !== "system");
}

function hasUserImages(messages: ChatMessage[]) {
  return messages.some((m) => m.role === "user" && Boolean(m.images?.length));
}

function imageToDataUrl(ref: string) {
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  if (ref.startsWith("data:")) return ref;
  if (ref.startsWith("db:")) return `data:${ref.slice(3)}`;
  return `data:image/jpeg;base64,${ref}`;
}

type VisionContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type VisionApiMessage = {
  role: "user" | "assistant";
  content: string | VisionContentPart[];
};

function buildVisionApiMessages(
  messages: ChatMessage[],
  language: LanguageCode = DEFAULT_LANGUAGE
): VisionApiMessage[] {
  const systemParts: string[] = [];
  const apiMessages: VisionApiMessage[] = [];
  let mergedSystem = false;

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
      continue;
    }

    if (msg.role === "assistant") {
      apiMessages.push({ role: "assistant", content: msg.content });
      continue;
    }

    if (msg.role === "user" && msg.images?.length) {
      const prefix = !mergedSystem && systemParts.length ? `${systemParts.join("\n\n")}\n\n` : "";
      const text =
        `${prefix}${msg.content}`.trim() || buildVisionFallbackPrompt();
      const content: VisionContentPart[] = [{ type: "text", text }];

      for (const img of msg.images) {
        content.push({
          type: "image_url",
          image_url: { url: imageToDataUrl(img) }
        });
      }

      apiMessages.push({ role: "user", content });
      mergedSystem = true;
      continue;
    }

    apiMessages.push({ role: "user", content: msg.content });
  }

  return apiMessages;
}

function trimMessagesForContext(messages: ChatMessage[], maxPairs = 6) {
  const systemMessages = messages.filter((m) => m.role === "system");
  const conversation = messages.filter((m) => m.role !== "system");
  const maxMessages = Math.max(2, maxPairs * 2);

  return [...systemMessages, ...conversation.slice(-maxMessages)];
}

function parseEnvInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getOllamaOptions(hasImages: boolean) {
  return {
    temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0.6),
    top_p: Number(process.env.OLLAMA_TOP_P ?? 0.9),
    num_ctx: parseEnvInt("OLLAMA_NUM_CTX", hasImages ? 4096 : 2048),
    num_predict: parseEnvInt(
      "OLLAMA_NUM_PREDICT",
      hasImages ? 900 : 420
    ),
    repeat_penalty: Number(process.env.OLLAMA_REPEAT_PENALTY ?? 1.08)
  };
}

function formatOllamaError(errorText: string, model: string, hasImages: boolean) {
  if (/cuda|gpu|shared object initialization/i.test(errorText)) {
    return (
      "Ollama GPU/CUDA-Fehler. Ollama beenden, OLLAMA-CPU-FIX.bat ausführen " +
      "oder Umgebungsvariable OLLAMA_NUM_GPU=0 setzen und Ollama neu starten."
    );
  }
  if (/not found|does not exist/i.test(errorText)) {
    return `Ollama Modell '${model}' fehlt. Installieren mit: ollama pull ${model}`;
  }
  if (hasImages) {
    return `Ollama Fehler: ${errorText}. Vision-Modell: ollama pull ${model}`;
  }
  return `Ollama Fehler: ${errorText}`;
}

function stripImageBase64(ref: string) {
  if (ref.startsWith("db:")) {
    const payload = ref.slice(3);
    const comma = payload.indexOf(",");
    return comma >= 0 ? payload.slice(comma + 1) : payload;
  }
  if (ref.startsWith("data:")) {
    const comma = ref.indexOf(",");
    return comma >= 0 ? ref.slice(comma + 1) : ref;
  }
  return ref;
}

/** Nur normaler Chat-Text — Groq wenn AI_PROVIDER=groq. */
function resolveTextProvider(): ExtendedAIProvider {
  const configured = (process.env.AI_PROVIDER as ExtendedAIProvider) || "openai";

  if (configured === "ollama" && process.env.VERCEL) {
    return process.env.GROQ_API_KEY ? "groq" : "openai";
  }

  return configured;
}

/** Hochgeladene Bilder — gratis über Groq Vision auf Vercel, lokal Ollama. */
function resolveVisionProvider(): ExtendedAIProvider {
  const configured = process.env.VISION_PROVIDER as ExtendedAIProvider | undefined;

  if (configured) {
    if (configured === "ollama" && process.env.VERCEL) {
      return process.env.GROQ_API_KEY ? "groq" : "openai";
    }
    return configured;
  }

  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (!process.env.VERCEL) return "ollama";

  throw new Error(
    "Bild-Analyse braucht GROQ_API_KEY (gratis) oder OPENAI_API_KEY."
  );
}

type GenerateAIOptions = {
  provider?: ExtendedAIProvider;
  language?: LanguageCode;
};

function normalizeGenerateOptions(
  options?: GenerateAIOptions | ExtendedAIProvider
): GenerateAIOptions {
  return typeof options === "string" ? { provider: options } : options ?? {};
}

function resolveActiveProvider(
  messages: ChatMessage[],
  options?: GenerateAIOptions
): { provider: ExtendedAIProvider; language: LanguageCode; needsVision: boolean } {
  const resolved = normalizeGenerateOptions(options);
  const language = resolved.language ?? DEFAULT_LANGUAGE;
  const needsVision = hasUserImages(messages);
  let provider =
    resolved.provider ?? (needsVision ? resolveVisionProvider() : resolveTextProvider());

  if (provider === "groq" && needsVision) {
    provider = resolveVisionProvider();
  }

  if (provider === "ollama" && process.env.VERCEL) {
    provider = process.env.OPENAI_API_KEY ? "openai" : resolveVisionProvider();
  }

  return { provider, language, needsVision };
}

async function* readOpenAICompatibleSSE(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // Ignore malformed SSE chunks.
      }
    }
  }
}

async function* readOllamaNDJSON(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line) as {
          message?: { content?: string };
        };
        const delta = parsed.message?.content;
        if (delta) yield delta;
      } catch {
        // Ignore malformed NDJSON chunks.
      }
    }
  }
}

async function* streamGroqResponse(
  messages: ChatMessage[],
  language: LanguageCode,
  needsVision: boolean
): AsyncGenerator<string, void, undefined> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY fehlt.");
  }

  const groqContextTurns = parseEnvInt("GROQ_MAX_TURNS", needsVision ? 3 : 3);
  const groqMessages = needsVision
    ? buildVisionApiMessages(trimMessagesForContext(messages, groqContextTurns), language)
    : trimMessagesForContext(messages, groqContextTurns);
  const model = needsVision
    ? process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct"
    : process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const maxTokens = needsVision
    ? parseEnvInt("GROQ_VISION_MAX_TOKENS", 520)
    : parseEnvInt("GROQ_MAX_TOKENS", 360);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.45,
      max_tokens: maxTokens,
      messages: groqMessages
    }),
    signal: AbortSignal.timeout(needsVision ? 28000 : 12000)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      needsVision
        ? `Bild-Analyse fehlgeschlagen: ${errorText.slice(0, 220)}`
        : `Groq API Fehler: ${errorText.slice(0, 220)}`
    );
  }

  if (!res.body) {
    throw new Error("Groq Streaming-Antwort fehlt.");
  }

  yield* readOpenAICompatibleSSE(res.body);
}

async function* streamOpenAIResponse(
  messages: ChatMessage[],
  language: LanguageCode,
  needsVision: boolean
): AsyncGenerator<string, void, undefined> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY fehlt.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const apiMessages = (needsVision
    ? buildVisionApiMessages(messages, language)
    : messages) as OpenAI.Chat.ChatCompletionMessageParam[];

  try {
    const stream = await openai.chat.completions.create({
      model: needsVision
        ? process.env.OPENAI_VISION_MODEL || "gpt-4o-mini"
        : process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      stream: true,
      messages: apiMessages
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (error) {
    const apiError = error as { status?: number; message?: string };
    const isQuota =
      apiError.status === 429 || /quota|billing/i.test(apiError.message ?? "");

    if (isQuota && process.env.GROQ_API_KEY) {
      yield* streamGroqResponse(messages, language, needsVision);
      return;
    }

    throw error;
  }
}

async function* streamOllamaResponse(
  messages: ChatMessage[]
): AsyncGenerator<string, void, undefined> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const contextMessages = trimMessagesForContext(
    messages,
    parseEnvInt("OLLAMA_MAX_TURNS", 6)
  );
  const hasImages = contextMessages.some(
    (m) => m.role === "user" && (m as ChatMessage).images?.length
  );
  const model = hasImages
    ? process.env.OLLAMA_VISION_MODEL || "llava"
    : process.env.OLLAMA_MODEL || "llama3.1";

  const ollamaMessages = contextMessages
    .filter((m) => m.role !== "system" || m.content)
    .map((m) => {
      const msg = m as ChatMessage;
      const payload: {
        role: string;
        content: string;
        images?: string[];
      } = {
        role: msg.role,
        content: msg.content
      };
      if (msg.images?.length) {
        payload.images = msg.images.map(stripImageBase64);
      }
      return payload;
    });

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      keep_alive: process.env.OLLAMA_KEEP_ALIVE || "30m",
      messages: ollamaMessages,
      options: getOllamaOptions(hasImages)
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(formatOllamaError(errorText, model, hasImages));
  }

  if (!res.body) {
    throw new Error("Ollama Streaming-Antwort fehlt.");
  }

  yield* readOllamaNDJSON(res.body);
}

export async function* streamAIResponse(
  messages: ChatMessage[],
  options?: GenerateAIOptions | ExtendedAIProvider
): AsyncGenerator<string, void, undefined> {
  const resolved = normalizeGenerateOptions(options);
  const { provider, language, needsVision } = resolveActiveProvider(messages, resolved);

  if (provider === "groq") {
    yield* streamGroqResponse(messages, language, needsVision);
    return;
  }

  if (provider === "openai") {
    yield* streamOpenAIResponse(messages, language, needsVision);
    return;
  }

  if (provider === "ollama") {
    yield* streamOllamaResponse(messages);
    return;
  }

  const full = await generateAIResponse(messages, resolved);
  if (full) yield full;
}

export async function generateAIResponse(
  messages: ChatMessage[],
  options?: GenerateAIOptions | ExtendedAIProvider
) {
  const resolved = normalizeGenerateOptions(options);
  const { provider, language, needsVision } = resolveActiveProvider(messages, resolved);

  if (provider === "claude") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY fehlt.");
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: getNonSystemMessages(messages).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      })),
      system: getSystemText(messages)
    });

    const first = response.content[0];
    return first?.type === "text" ? first.text : "No response";
  }

  if (provider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY fehlt.");
    }
    const context = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const model = process.env.GEMINI_MODEL || "gemini-2.5-pro";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: context }]
            }
          ]
        })
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API Fehler: ${errorText}`);
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("") || "";
    return text || "No response";
  }

  if (provider === "groq") {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY fehlt.");
    }

    const vision = needsVision;
    const groqContextTurns = parseEnvInt("GROQ_MAX_TURNS", vision ? 3 : 3);
    const groqMessages = vision
      ? buildVisionApiMessages(trimMessagesForContext(messages, groqContextTurns), language)
      : trimMessagesForContext(messages, groqContextTurns);
    const model = vision
      ? process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct"
      : process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const maxTokens = vision
      ? parseEnvInt("GROQ_VISION_MAX_TOKENS", 520)
      : parseEnvInt("GROQ_MAX_TOKENS", 360);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: maxTokens,
        messages: groqMessages
      }),
      signal: AbortSignal.timeout(vision ? 28000 : 12000)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        vision
          ? `Bild-Analyse fehlgeschlagen: ${errorText.slice(0, 220)}`
          : `Groq API Fehler: ${errorText.slice(0, 220)}`
      );
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "No response";
  }

  if (provider === "ollama") {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    const contextMessages = trimMessagesForContext(
      messages,
      parseEnvInt("OLLAMA_MAX_TURNS", 6)
    );
    const hasImages = contextMessages.some(
      (m) => m.role === "user" && (m as ChatMessage).images?.length
    );
    const model = hasImages
      ? process.env.OLLAMA_VISION_MODEL || "llava"
      : process.env.OLLAMA_MODEL || "llama3.1";

    const ollamaMessages = contextMessages
      .filter((m) => m.role !== "system" || m.content)
      .map((m) => {
        const msg = m as ChatMessage;
        const payload: {
          role: string;
          content: string;
          images?: string[];
        } = {
          role: msg.role,
          content: msg.content
        };
        if (msg.images?.length) {
          payload.images = msg.images.map(stripImageBase64);
        }
        return payload;
      });

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || "30m",
        messages: ollamaMessages,
        options: getOllamaOptions(hasImages)
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(formatOllamaError(errorText, model, hasImages));
    }

    const data = await res.json();
    return data?.message?.content ?? "No response";
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY fehlt.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const vision = hasUserImages(messages);

  try {
    const completion = await openai.chat.completions.create({
      model: vision
        ? process.env.OPENAI_VISION_MODEL || "gpt-4o-mini"
        : process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: (vision
        ? buildVisionApiMessages(messages, language)
        : messages) as OpenAI.Chat.ChatCompletionMessageParam[]
    });

    return completion.choices[0]?.message?.content ?? "No response";
  } catch (error) {
    const apiError = error as { status?: number; message?: string };
    const isQuota =
      apiError.status === 429 || /quota|billing/i.test(apiError.message ?? "");

    if (isQuota && vision && process.env.GROQ_API_KEY) {
      return generateAIResponse(messages, { provider: "groq", language });
    }

    if (isQuota && vision) {
      throw new Error(
        "OpenAI-Guthaben für Bild-Analyse ist leer. Nutze GROQ_API_KEY (gratis) für Bild-Uploads."
      );
    }

    if (isQuota && process.env.GROQ_API_KEY) {
      return generateAIResponse(messages, { provider: "groq", language });
    }

    if (isQuota) {
      throw new Error(
        "OpenAI-Guthaben ist aufgebraucht. Lade bei platform.openai.com Guthaben auf " +
          "oder nutze Groq für Text: GROQ_API_KEY + AI_PROVIDER=groq."
      );
    }

    throw error;
  }
}
