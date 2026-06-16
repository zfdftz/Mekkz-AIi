import OpenAI from "openai";

function whisperLanguageHint(locale: string) {
  const code = locale.slice(0, 2).toLowerCase();
  return code || undefined;
}

async function transcribeWithGroq(
  file: File,
  language?: string
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo");
  form.append("response_format", "json");
  if (language) form.append("language", language);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: form
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 200) || `Groq Whisper HTTP ${res.status}`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

async function transcribeWithOpenAI(
  file: File,
  language?: string
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_WHISPER_MODEL || "whisper-1",
    language
  });
  return result.text?.trim() ?? "";
}

export function isServerTranscribeConfigured() {
  return Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY);
}

export async function transcribeUploadedAudio(
  file: File,
  locale = "de-DE"
): Promise<string> {
  if (!isServerTranscribeConfigured()) {
    throw new Error(
      "Server-Spracherkennung fehlt (GROQ_API_KEY oder OPENAI_API_KEY in Vercel)."
    );
  }

  const language = whisperLanguageHint(locale);
  if (process.env.GROQ_API_KEY) {
    return transcribeWithGroq(file, language);
  }
  return transcribeWithOpenAI(file, language);
}
