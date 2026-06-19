const LOOKUP_PATTERN =
  /\b(konusu|içeriği|icerigi|hakkında|hakkinda|nedir|ne zaman|kimdir|oyuncu|dizi|film|seri|bölüm|bolum|fragman|izle|yayın|yayin|hangi gün|hangi gun|season|episode|plot|cast|about|what is|who is|tell me about|wikipedia|news|güncel|guncel|neuer|neue|aktuell)\b/i;

const SLANG_LOOKUP_PATTERN =
  /\b(what does|what's|what is|meaning of|was bedeutet|was heisst|was heißt|define|stand for|short for|abbreviation|acronym|slang)\b/i;

const REFUSAL_LIKELY =
  /^(was ist|what is|what does|tell me|konusu|icerigi|içeriği|nedir|hakkında)/i;

export function needsWebLookup(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 8) return false;
  if (needsSlangDefinitionLookup(trimmed)) return true;
  if (LOOKUP_PATTERN.test(trimmed)) return true;
  if (/\?\s*$/.test(trimmed) && trimmed.split(/\s+/).length >= 4) return true;
  return REFUSAL_LIKELY.test(trimmed);
}

export function needsSlangDefinitionLookup(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 4) return false;
  if (!SLANG_LOOKUP_PATTERN.test(trimmed)) return false;
  return /\b[A-Za-z0-9.]{2,20}\b/.test(trimmed);
}

type DuckDuckGoTopic = { Text?: string; Topics?: DuckDuckGoTopic[] };

async function fetchDuckDuckGoContext(query: string) {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("skip_disambig", "1");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    AbstractText?: string;
    RelatedTopics?: DuckDuckGoTopic[];
  };

  const parts: string[] = [];
  if (data.AbstractText?.trim()) parts.push(data.AbstractText.trim());

  for (const topic of data.RelatedTopics ?? []) {
    if (topic.Text?.trim()) parts.push(topic.Text.trim());
    for (const sub of topic.Topics ?? []) {
      if (sub.Text?.trim()) parts.push(sub.Text.trim());
    }
  }

  const body = parts.join(" ").trim();
  return body.length >= 20 ? body : null;
}

/** Best-effort web lookup for slang, abbreviations, and short terms. */
export async function fetchSlangDefinitionContext(term: string, hintMeaning?: string) {
  const cleanTerm = term.trim();
  if (!cleanTerm) return null;

  const queries = [
    `${cleanTerm} slang meaning`,
    `${cleanTerm} abbreviation meaning`,
    hintMeaning ? `${cleanTerm} means ${hintMeaning}` : "",
    `what does ${cleanTerm} mean text`,
    `${cleanTerm} internet slang`
  ].filter(Boolean);

  const chunks: string[] = [];
  for (const query of queries) {
    try {
      const ddg = await fetchDuckDuckGoContext(query);
      if (ddg) chunks.push(ddg);
      const wiki = await fetchWebContext(query);
      if (wiki) chunks.push(wiki);
    } catch {
      // Best-effort lookup.
    }
    if (chunks.join(" ").length >= 240) break;
  }

  const combined = [...new Set(chunks)].join("\n").trim();
  return combined.length >= 20 ? combined.slice(0, 1800) : null;
}

function extractSubject(text: string) {
  const named =
    text.match(/(?:adi|adı|adim|adım|ismi|named|called|name is|heißt|heisst)\s+([^.?!\n]+)/i)?.[1] ??
    text.match(/["„"']([^"„"']{2,80})["„"']/i)?.[1];

  if (named) {
    const clean = named.replace(/\?/g, "").trim();
    if (clean.length >= 2) return clean;
  }

  const diziMatch = text.match(/\b([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s.'-]{1,60})\b(?=\s*(?:dizi|film|seri|series|show|program))/i);
  if (diziMatch?.[1]) return diziMatch[1].trim();

  const inlineTitle = text.match(/\b(daha\s*\d+|[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý0-9][a-zà-öø-ÿ0-9]+){0,4})\b/);
  if (inlineTitle?.[1] && /dizi|film|seri|series|konusu|icerigi|içeriği|nedir/i.test(text)) {
    return inlineTitle[1].trim();
  }

  return null;
}

function titleCase(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function directTitleVariants(query: string) {
  const base = query.replace(/\bdizi\b/gi, "").trim();
  const titled = titleCase(base);
  const variants = new Set<string>();

  for (const candidate of [query, base, titled]) {
    if (!candidate) continue;
    variants.add(candidate);
    variants.add(`${candidate} (dizi)`);
    if (!/\bdizi\b/i.test(candidate)) variants.add(`${candidate} dizi`);
  }

  return [...variants];
}

function buildSearchTerms(text: string) {
  const subject = extractSubject(text);
  if (subject) {
    if (/dizi|film|seri|series|show|tv/i.test(text) && !/\bdizi\b/i.test(subject)) {
      return `${subject} dizi`;
    }
    return subject;
  }

  const cleaned = text
    .replace(/\?/g, " ")
    .replace(
      /\b(yeni bir|var|konusu|içeriği|icerigi|nedir|ne|what is|tell me about|hakkında|hakkinda|about|bir)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  if (/dizi|film|seri|series/i.test(text) && cleaned.length >= 3) {
    return `${cleaned} dizi`;
  }

  return cleaned.slice(0, 120);
}

type WikiSummary = {
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
};

async function fetchWikiSummary(lang: "tr" | "en", title: string) {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    }
  );
  if (!res.ok) return null;
  return (await res.json()) as WikiSummary;
}

async function searchWiki(lang: "tr" | "en", query: string) {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("srlimit", "3");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    query?: { search?: { title: string }[] };
  };
  return (data.query?.search ?? []).map((item) => item.title);
}

function isRelevant(summary: WikiSummary, query: string) {
  const hay = `${summary.title ?? ""} ${summary.extract ?? ""}`.toLowerCase();
  const tokens = query
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bdizi\b|\bfilm\b|\bseri\b|\bseries\b/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 || /^\d+$/.test(token));

  if (tokens.length === 0) return true;
  return tokens.every((token) => hay.includes(token));
}

function pickSummary(summary: WikiSummary | null, query: string) {
  if (!summary?.extract || summary.extract.length <= 40) return null;
  if (!isRelevant(summary, query)) return null;
  return formatSummary(summary);
}

function formatSummary(summary: WikiSummary) {
  const parts = [
    summary.title,
    summary.description,
    summary.extract
  ].filter(Boolean);
  const url = summary.content_urls?.desktop?.page;
  const body = parts.join(" — ");
  return url ? `${body}\nSource: ${url}` : body;
}

/** Best-effort Wikipedia lookup for TV shows, people, and general topics. */
export async function fetchWebContext(userText: string) {
  const query = buildSearchTerms(userText);
  if (!query) return null;

  const langs: ("tr" | "en")[] =
    /[çğıöşüÇĞİÖŞÜ]|dizi|konusu|nedir|içeri|iceri|hakkında|hakkinda|adi|adı/i.test(userText)
      ? ["tr", "en"]
      : ["en", "tr"];

  for (const lang of langs) {
    for (const title of directTitleVariants(query)) {
      const picked = pickSummary(await fetchWikiSummary(lang, title), query);
      if (picked) return picked;
    }

    const titles = await searchWiki(lang, query);
    for (const title of titles.slice(0, 5)) {
      const picked = pickSummary(await fetchWikiSummary(lang, title), query);
      if (picked) return picked;
    }
  }

  return null;
}

export function buildWebContextPrompt(context: string) {
  return (
    "WEB RESEARCH (use these facts in your answer — do not ignore):\n" +
    context +
    "\nAnswer the user from this info. Reply in the user's message language. Do not say you have no data."
  );
}
