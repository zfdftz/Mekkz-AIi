export type SocialComment = {
  author: string;
  text: string;
  likes?: string;
  published?: string;
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function extractScriptJson(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      return JSON.parse(match[1]) as unknown;
    } catch {
      // try next pattern
    }
  }
  return null;
}

function collectYouTubeComments(data: unknown, limit = 35): SocialComment[] {
  const out: SocialComment[] = [];

  function walk(node: unknown, depth = 0) {
    if (out.length >= limit || depth > 28 || !node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }

    const record = node as Record<string, unknown>;
    if (record.commentRenderer) {
      const comment = record.commentRenderer as Record<string, unknown>;
      const authorText = comment.authorText as { simpleText?: string } | undefined;
      const contentText = comment.contentText as { runs?: { text?: string }[] } | undefined;
      const voteCount = comment.voteCount as { simpleText?: string } | undefined;
      const publishedTimeText = comment.publishedTimeText as { simpleText?: string } | undefined;
      const text = contentText?.runs?.map((run) => run.text ?? "").join("").trim() ?? "";
      const author = authorText?.simpleText?.trim() ?? "";

      if (author && text) {
        out.push({
          author,
          text,
          likes: voteCount?.simpleText,
          published: publishedTimeText?.simpleText
        });
      }
    }

    for (const value of Object.values(record)) {
      if (out.length >= limit) break;
      walk(value, depth + 1);
    }
  }

  walk(data);
  return out;
}

function collectTikTokComments(data: unknown, limit = 35): SocialComment[] {
  const out: SocialComment[] = [];

  function walk(node: unknown, depth = 0) {
    if (out.length >= limit || depth > 30 || !node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }

    const record = node as Record<string, unknown>;

    const text =
      (typeof record.text === "string" && record.text.trim()) ||
      (typeof record.comment === "string" && record.comment.trim()) ||
      "";

    const author =
      (typeof record.nickname === "string" && record.nickname.trim()) ||
      (typeof record.uniqueId === "string" && record.uniqueId.trim()) ||
      (typeof record.user === "string" && record.user.trim()) ||
      "";

    const likes =
      typeof record.diggCount === "number"
        ? String(record.diggCount)
        : typeof record.likeCount === "number"
          ? String(record.likeCount)
          : undefined;

    if (
      text.length >= 2 &&
      text.length <= 500 &&
      author.length >= 1 &&
      (record.comment || record.text || record.awemeId || record.cid)
    ) {
      const key = `${author}:${text.slice(0, 80)}`;
      if (!out.some((item) => `${item.author}:${item.text.slice(0, 80)}` === key)) {
        out.push({ author, text, likes });
      }
    }

    for (const value of Object.values(record)) {
      if (out.length >= limit) break;
      walk(value, depth + 1);
    }
  }

  walk(data);
  return out.filter((item) => item.text.length >= 2).slice(0, limit);
}

function formatCommentsBlock(comments: SocialComment[], platform: string) {
  if (comments.length === 0) {
    return `${platform} comments: none could be loaded (page may block bots or load comments via JS only).`;
  }

  return (
    `${platform} comments (${comments.length} loaded):\n` +
    comments
      .map((comment, index) => {
        const meta = [
          comment.published ? `time: ${comment.published}` : "",
          comment.likes ? `likes: ${comment.likes}` : ""
        ]
          .filter(Boolean)
          .join(", ");
        return `${index + 1}. @${comment.author}${meta ? ` (${meta})` : ""}: ${comment.text}`;
      })
      .join("\n")
  );
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

export function parseTikTokUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("tiktok.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const username = parts[0]?.startsWith("@") ? parts[0].slice(1) : parts[0] ?? null;
    const videoIndex = parts.indexOf("video");
    const videoId = videoIndex >= 0 ? parts[videoIndex + 1] ?? null : null;

    return {
      url,
      username,
      videoId,
      isProfile: Boolean(username && !videoId),
      isVideo: Boolean(videoId)
    };
  } catch {
    return null;
  }
}

export async function fetchYouTubeContext(url: string) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL.");

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const [pageRes, oembedRes] = await Promise.all([
    fetch(watchUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8"
      },
      signal: AbortSignal.timeout(15000)
    }),
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`, {
      signal: AbortSignal.timeout(8000)
    }).catch(() => null)
  ]);

  let title = "Unknown video";
  let author = "";

  if (oembedRes?.ok) {
    const data = (await oembedRes.json()) as { title?: string; author_name?: string };
    title = data.title ?? title;
    author = data.author_name ?? "";
  }

  let description = "";
  let comments: SocialComment[] = [];

  if (pageRes.ok) {
    const html = await pageRes.text();
    const ytInitialData = extractScriptJson(html, [
      /var ytInitialData = (\{[\s\S]*?\});<\/script>/,
      /ytInitialData\s*=\s*(\{[\s\S]*?\});/
    ]);

    if (ytInitialData) {
      comments = collectYouTubeComments(ytInitialData, 35);

      const descMatch = html.match(
        /"description":\{"simpleText":"((?:\\.|[^"\\])*)"/
      );
      if (descMatch?.[1]) {
        description = descMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) =>
            String.fromCharCode(Number.parseInt(hex, 16))
          )
          .slice(0, 2500);
      }
    }
  }

  return {
    videoId,
    title,
    author,
    url: watchUrl,
    description,
    comments,
    commentsNote:
      comments.length > 0
        ? "Comments were extracted from the public watch page."
        : "No comments could be scraped — mention that and use title/description only."
  };
}

export function formatYouTubeContext(ctx: Awaited<ReturnType<typeof fetchYouTubeContext>>) {
  return [
    `YouTube Video: ${ctx.title}`,
    ctx.author ? `Channel: ${ctx.author}` : "",
    `URL: ${ctx.url}`,
    ctx.description ? `Description:\n${ctx.description}` : "",
    formatCommentsBlock(ctx.comments, "YouTube"),
    ctx.commentsNote
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function fetchTikTokOembed(url: string) {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    return (await res.json()) as {
      title?: string;
      author_name?: string;
      author_url?: string;
    };
  } catch {
    return null;
  }
}

export async function fetchTikTokContext(url: string) {
  const parsed = parseTikTokUrl(url);
  if (!parsed) throw new Error("Invalid TikTok URL.");

  const pageRes = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9,de;q=0.8"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!pageRes.ok) {
    throw new Error(`TikTok page fetch failed (${pageRes.status}).`);
  }

  const html = await pageRes.text();
  const universalData = extractScriptJson(html, [
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/,
    /id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/
  ]);

  const oembed = await fetchTikTokOembed(url);

  let profileBio = "";
  let profileNickname = parsed.username ? `@${parsed.username}` : "";
  let followerHint = "";
  let videoDescription = oembed?.title ?? "";

  if (universalData) {
    const comments = collectTikTokComments(universalData, 35);

    const jsonText = JSON.stringify(universalData);
    const followerMatch = jsonText.match(/"followerCount":(\d+)/);
    const followingMatch = jsonText.match(/"followingCount":(\d+)/);
    const heartMatch = jsonText.match(/"heartCount":(\d+)/);
    const signatureMatch = jsonText.match(/"signature":"((?:\\.|[^"\\])*)"/);

    if (signatureMatch?.[1]) {
      profileBio = signatureMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .slice(0, 800);
    }

    if (followerMatch) {
      followerHint = [
        followerMatch ? `followers: ${followerMatch[1]}` : "",
        followingMatch ? `following: ${followingMatch[1]}` : "",
        heartMatch ? `likes: ${heartMatch[1]}` : ""
      ]
        .filter(Boolean)
        .join(", ");
    }

    if (oembed?.author_name) {
      profileNickname = oembed.author_name;
    }

    return {
      url,
      kind: parsed.isVideo ? ("video" as const) : ("profile" as const),
      username: parsed.username,
      videoId: parsed.videoId,
      profileNickname,
      profileBio,
      followerHint,
      videoDescription,
      authorUrl: oembed?.author_url ?? (parsed.username ? `https://www.tiktok.com/@${parsed.username}` : ""),
      comments,
      commentsNote:
        comments.length > 0
          ? "Comments/profile data extracted from public TikTok page JSON."
          : "Limited data — TikTok may block full comment/profile loads."
    };
  }

  return {
    url,
    kind: parsed.isVideo ? ("video" as const) : ("profile" as const),
    username: parsed.username,
    videoId: parsed.videoId,
    profileNickname: oembed?.author_name ?? profileNickname,
    profileBio,
    followerHint,
    videoDescription,
    authorUrl: oembed?.author_url ?? "",
    comments: [] as SocialComment[],
    commentsNote: "Could not parse TikTok page JSON — using oEmbed metadata only."
  };
}

export function formatTikTokContext(ctx: Awaited<ReturnType<typeof fetchTikTokContext>>) {
  const lines = [
    ctx.kind === "video" ? "TikTok Video" : "TikTok Profile",
    ctx.profileNickname ? `Creator: ${ctx.profileNickname}` : "",
    ctx.username ? `Username: @${ctx.username}` : "",
    ctx.authorUrl ? `Profile URL: ${ctx.authorUrl}` : "",
    ctx.followerHint ? `Profile stats: ${ctx.followerHint}` : "",
    ctx.profileBio ? `Bio: ${ctx.profileBio}` : "",
    ctx.videoDescription ? `Video caption/title: ${ctx.videoDescription}` : "",
    `URL: ${ctx.url}`,
    formatCommentsBlock(ctx.comments, "TikTok"),
    ctx.commentsNote
  ];

  return lines.filter(Boolean).join("\n\n");
}
