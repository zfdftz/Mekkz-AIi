import { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "chat-images";

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function loadImageBuffer(source: string) {
  if (isHttpUrl(source)) {
    const res = await fetch(source, {
      headers: { "User-Agent": "mekkz-ai/1.0" },
      signal: AbortSignal.timeout(120000)
    });
    if (!res.ok) {
      throw new Error(`Bild konnte nicht geladen werden (${res.status}).`);
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType };
  }

  return {
    buffer: Buffer.from(source, "base64"),
    contentType: "image/jpeg"
  };
}

export async function persistChatImage(
  admin: SupabaseClient,
  userId: string,
  conversationId: string,
  source: string,
  kind: "user" | "assistant"
) {
  if (!source) return null;

  try {
    const { buffer, contentType } = await loadImageBuffer(source);
    if (buffer.byteLength < 500) {
      throw new Error("Bilddaten zu klein.");
    }

    const ext = extensionFromContentType(contentType);
    const filePath = `${userId}/${conversationId}/${kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(filePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000"
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    try {
      const { buffer, contentType } = isHttpUrl(source)
        ? await loadImageBuffer(source)
        : { buffer: Buffer.from(source, "base64"), contentType: "image/jpeg" };
      return `db:${contentType};base64,${buffer.toString("base64")}`;
    } catch {
      return source;
    }
  }
}

export function imageRefToSrc(imageRef: string) {
  if (imageRef.startsWith("db:")) {
    return `data:${imageRef.slice(3)}`;
  }
  if (isHttpUrl(imageRef)) {
    return imageRef;
  }
  return `data:image/jpeg;base64,${imageRef}`;
}

export { BUCKET };
