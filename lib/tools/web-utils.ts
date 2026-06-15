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

export function extractYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

/** Best-effort YouTube metadata via oEmbed (no API key required). */
export async function fetchYouTubeContext(url: string) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL.");

  const oembedRes = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { signal: AbortSignal.timeout(8000) }
  );

  let title = "Unknown video";
  let author = "";

  if (oembedRes.ok) {
    const data = (await oembedRes.json()) as { title?: string; author_name?: string };
    title = data.title ?? title;
    author = data.author_name ?? "";
  }

  // Supplement with Wikipedia-style search for topic context
  const wikiQuery = encodeURIComponent(`${title} ${author}`.trim());
  let wikiExtract = "";

  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${wikiQuery}&format=json&srlimit=1`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (wikiRes.ok) {
      const wikiData = (await wikiRes.json()) as {
        query?: { search?: { title: string }[] };
      };
      const wikiTitle = wikiData.query?.search?.[0]?.title;
      if (wikiTitle) {
        const summaryRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (summaryRes.ok) {
          const summary = (await summaryRes.json()) as { extract?: string };
          wikiExtract = summary.extract ?? "";
        }
      }
    }
  } catch {
    // Optional enrichment only.
  }

  return {
    videoId,
    title,
    author,
    url,
    wikiExtract,
    note:
      "Full transcript not available without YouTube API. Use title, author, and related context to answer. Ask user for key timestamps if needed."
  };
}

export function formatYouTubeContext(ctx: Awaited<ReturnType<typeof fetchYouTubeContext>>) {
  return [
    `YouTube Video: ${ctx.title}`,
    ctx.author ? `Channel: ${ctx.author}` : "",
    `URL: ${ctx.url}`,
    ctx.wikiExtract ? `Related context: ${ctx.wikiExtract}` : "",
    ctx.note
  ]
    .filter(Boolean)
    .join("\n");
}
