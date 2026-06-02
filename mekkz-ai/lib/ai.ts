import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage } from "./types";

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

export async function generateAIResponse(
  messages: ChatMessage[],
  selectedProvider?: ExtendedAIProvider
) {
  const provider =
    selectedProvider ??
    ((process.env.AI_PROVIDER as ExtendedAIProvider) || "openai");

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

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        temperature: 0.7,
        messages
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API Fehler: ${errorText}`);
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
          payload.images = msg.images;
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
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1",
    temperature: 0.7,
    messages
  });

  return completion.choices[0]?.message?.content ?? "No response";
}
