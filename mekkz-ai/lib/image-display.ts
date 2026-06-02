"use client";

export function resolveChatImageSrc(imageRef?: string | null) {
  if (!imageRef) return "";
  if (imageRef.startsWith("db:")) {
    return `data:${imageRef.slice(3)}`;
  }
  if (imageRef.startsWith("http://") || imageRef.startsWith("https://")) {
    return imageRef;
  }
  return `data:image/jpeg;base64,${imageRef}`;
}
