import { generateAIResponse } from "@/lib/ai";
import type { ChatMessage } from "@/lib/types";

export const FEED_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const FEED_VIDEO_MAX_BYTES = 20 * 1024 * 1024;
export const FEED_VIDEO_MAX_SECONDS = 30;

export type ModerationResult = {
  safe: boolean;
  reason?: string;
};

function parseModeration(raw: string): ModerationResult {
  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) as {
      safe?: boolean;
      reason?: string;
    };
    return { safe: Boolean(json.safe), reason: json.reason };
  } catch {
    const lower = raw.toLowerCase();
    if (/\"safe\"\s*:\s*true/.test(raw) || /\bsafe\b/.test(lower) && !/unsafe|not safe|false/.test(lower)) {
      return { safe: true };
    }
    return { safe: false, reason: "Inhalt konnte nicht freigegeben werden." };
  }
}

export async function moderateImage(dataUrl: string): Promise<ModerationResult> {
  if (!dataUrl.startsWith("data:image/")) {
    return { safe: false, reason: "Ungültiges Bildformat." };
  }
  const bytes = dataUrlSize(dataUrl);
  if (bytes > FEED_IMAGE_MAX_BYTES) {
    return { safe: false, reason: `Bild max. ${FEED_IMAGE_MAX_BYTES / (1024 * 1024)} MB.` };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        'Content safety moderator. Reply ONLY valid JSON: {"safe":boolean,"reason":"short German explanation if unsafe"}. Mark unsafe: pornography, nudity, gore, violence, death, weapons aimed at people, hate symbols, illegal drugs.'
    },
    {
      role: "user",
      content: "Prüfe dieses Bild für einen öffentlichen Community-Feed.",
      images: [dataUrl]
    }
  ];

  try {
    const reply = await generateAIResponse(messages, { provider: "groq" });
    const result = parseModeration(reply);
    if (!result.safe && !result.reason) {
      result.reason = "Inhalt verstößt gegen die Community-Richtlinien.";
    }
    return result;
  } catch {
    return { safe: false, reason: "Safety-Check fehlgeschlagen. Bitte erneut versuchen." };
  }
}

export async function moderateVideoPoster(posterDataUrl: string, videoBytes: number): Promise<ModerationResult> {
  if (videoBytes > FEED_VIDEO_MAX_BYTES) {
    return { safe: false, reason: `Video max. ${FEED_VIDEO_MAX_BYTES / (1024 * 1024)} MB.` };
  }
  if (!posterDataUrl.startsWith("data:image/")) {
    return { safe: false, reason: "Video-Vorschau fehlt." };
  }
  return moderateImage(posterDataUrl);
}

function dataUrlSize(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return 0;
  return Math.ceil((base64.length * 3) / 4);
}

export function dataUrlByteSize(dataUrl: string) {
  return dataUrlSize(dataUrl);
}
