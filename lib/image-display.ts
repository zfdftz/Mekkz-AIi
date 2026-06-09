"use client";

export { buildPollinationsImageUrl as buildClientPollinationsImageUrl } from "./pollinations-url";

export function resolveChatImageSrc(imageRef?: string | null) {
  if (!imageRef) return "";
  if (imageRef.startsWith("db:")) {
    return `data:${imageRef.slice(3)}`;
  }
  if (
    imageRef.startsWith("http://") ||
    imageRef.startsWith("https://") ||
    imageRef.startsWith("/api/")
  ) {
    return imageRef;
  }
  return `data:image/jpeg;base64,${imageRef}`;
}
