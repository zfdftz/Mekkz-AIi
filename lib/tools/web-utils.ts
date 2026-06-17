/** Fetch and extract readable text from a public webpage. */
export async function fetchPageText(url: string, maxChars = 12000) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported.");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "mekkz-ai-tools/1.0",
      Accept: "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!res.ok) {
    throw new Error(`Page fetch failed (${res.status}).`);
  }

  const html = await res.text();
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 80) {
    throw new Error("Could not extract readable text from this page.");
  }

  return text.slice(0, maxChars);
}

export {
  extractYouTubeVideoId,
  fetchTikTokContext,
  fetchYouTubeContext,
  formatTikTokContext,
  formatYouTubeContext,
  parseTikTokUrl
} from "./social-url-context";
