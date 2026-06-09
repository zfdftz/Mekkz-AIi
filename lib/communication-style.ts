import { SupabaseClient } from "@supabase/supabase-js";

const STOPWORDS = new Set([
  "aber",
  "alle",
  "also",
  "and",
  "auch",
  "bei",
  "bist",
  "das",
  "dass",
  "dein",
  "deine",
  "dem",
  "den",
  "der",
  "des",
  "die",
  "dir",
  "doch",
  "du",
  "ein",
  "eine",
  "einem",
  "einen",
  "einer",
  "eines",
  "er",
  "es",
  "für",
  "hat",
  "hier",
  "ich",
  "ihr",
  "ihre",
  "ist",
  "kann",
  "mal",
  "man",
  "mein",
  "mir",
  "mit",
  "nach",
  "nicht",
  "noch",
  "nur",
  "oder",
  "schon",
  "sehr",
  "sie",
  "sind",
  "the",
  "und",
  "von",
  "was",
  "weg",
  "wie",
  "wir",
  "wird",
  "you",
  "your"
]);

const COMMON_WORDS = new Set([
  ...STOPWORDS,
  "ai",
  "alle",
  "alles",
  "antwort",
  "antworten",
  "bild",
  "bilder",
  "bilderstellung",
  "bitte",
  "chat",
  "chats",
  "delay",
  "einstellung",
  "einstellungen",
  "erstelle",
  "erstellen",
  "free",
  "generierung",
  "generieren",
  "hab",
  "habe",
  "hallo",
  "help",
  "hey",
  "hi",
  "kannst",
  "limit",
  "mach",
  "mache",
  "machst",
  "mekkz",
  "message",
  "messages",
  "nachricht",
  "nachrichten",
  "normal",
  "nur",
  "plan",
  "pro",
  "schick",
  "schicke",
  "schicken",
  "schreib",
  "schreibe",
  "schreiben",
  "senden",
  "soll",
  "sollen",
  "tarif",
  "tarife",
  "text",
  "texte",
  "ultra",
  "version",
  "will",
  "willst",
  "wird",
  "word",
  "wörter"
]);

const YOUTH_SLANG = new Set([
  "abi",
  "af",
  "alter",
  "amk",
  "based",
  "brudi",
  "bro",
  "bruh",
  "cap",
  "chill",
  "chillig",
  "copium",
  "cringe",
  "digga",
  "digger",
  "ey",
  "fanum",
  "fire",
  "fr",
  "geil",
  "goated",
  "habibi",
  "heftig",
  "highkey",
  "irl",
  "krass",
  "lan",
  "lit",
  "lmao",
  "lol",
  "lost",
  "lowkey",
  "mega",
  "mid",
  "ngl",
  "nocap",
  "npc",
  "omg",
  "ratio",
  "rizz",
  "safe",
  "sheesh",
  "sigma",
  "slay",
  "sus",
  "tbh",
  "vallah",
  "vibe",
  "vibes",
  "wallah",
  "wild",
  "wtf",
  "yolo",
  "yo"
]);

const SLANG_PHRASE_HINTS = [
  "mach das weg",
  "nimm das weg",
  "say less",
  "no cap",
  "lowkey",
  "highkey",
  "digga was",
  "alter schwede",
  "vallah ehrlich",
  "safe safe",
  "ist schon",
  "bro bitte",
  "sheesh ok"
];

export type CommunicationStyleProfile = {
  enabled: boolean;
  stylePrompt: string;
  frequentTerms: string[];
  analyzedMessages: number;
};

function isMissingTableError(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
}

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function isUsefulMessage(text: string) {
  const clean = normalizeText(text);
  if (clean.length < 4) return false;
  if (/^\[Bild:/i.test(clean)) return false;
  if (/^Dateikontext \(/i.test(clean)) return false;
  return true;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2);
}

function isYouthSlang(word: string) {
  return YOUTH_SLANG.has(word.toLowerCase());
}

function isCommonWord(word: string) {
  return COMMON_WORDS.has(word.toLowerCase());
}

function looksLikeAnglicism(word: string) {
  return /^[a-z]{3,}$/i.test(word) && !/[äöüß]/i.test(word);
}

function isSpecialWord(word: string, count: number) {
  const lower = word.toLowerCase();
  if (isCommonWord(lower)) return false;
  if (isYouthSlang(lower)) return count >= 2;
  if (/\d/.test(lower) || /(.)\1{2,}/.test(lower)) return count >= 2;
  if (looksLikeAnglicism(lower) && count >= 2) return true;
  if (lower.length >= 5 && count >= 3) return true;
  return false;
}

function getDistinctiveTerms(texts: string[], limit = 8) {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const seen = new Set<string>();
    for (const word of tokenize(text)) {
      if (seen.has(word)) continue;
      seen.add(word);
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([word, count]) => isSpecialWord(word, count))
    .sort((a, b) => {
      const aSlang = isYouthSlang(a[0]) ? 1 : 0;
      const bSlang = isYouthSlang(b[0]) ? 1 : 0;
      if (aSlang !== bSlang) return bSlang - aSlang;
      return b[1] - a[1];
    })
    .slice(0, limit)
    .map(([word]) => word);
}

function phraseHasSlangSignal(phrase: string) {
  const lower = phrase.toLowerCase();
  const words = lower.split(" ");

  if (words.some((word) => isYouthSlang(word))) return true;
  if (SLANG_PHRASE_HINTS.some((hint) => lower.includes(hint))) return true;

  const distinctiveWords = words.filter(
    (word) => !isCommonWord(word) && !STOPWORDS.has(word)
  );
  return distinctiveWords.length >= 1 && words.length >= 2;
}

function getDistinctivePhrases(texts: string[], limit = 4) {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const words = tokenize(text);
    const seen = new Set<string>();

    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (seen.has(phrase)) continue;
      seen.add(phrase);
      if (!phraseHasSlangSignal(phrase)) continue;
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }

    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (seen.has(phrase)) continue;
      seen.add(phrase);
      if (!phraseHasSlangSignal(phrase)) continue;
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase]) => phrase);
}

export function analyzeCommunicationStyle(texts: string[]) {
  const messages = texts.map(normalizeText).filter(isUsefulMessage);

  if (messages.length < 3) {
    return {
      stylePrompt: "",
      frequentTerms: [] as string[]
    };
  }

  const distinctiveTerms = getDistinctiveTerms(messages);
  const slangTerms = distinctiveTerms.filter((word) => isYouthSlang(word));
  const signatureTerms = distinctiveTerms.filter((word) => !isYouthSlang(word));
  const slangPhrases = getDistinctivePhrases(messages);

  if (!slangTerms.length && !signatureTerms.length && !slangPhrases.length) {
    return {
      stylePrompt: "",
      frequentTerms: [] as string[]
    };
  }

  const lines = [
    "Match the user's tone and wording style:",
    "- Reply in whatever language the user writes in, using their style when possible.",
    "- Remember slang and special words only — not everyday words like “image” or “chat”."
  ];

  if (slangTerms.length) {
    lines.push(
      `- Jugend-/Slang-Wörter des Nutzers (gelegentlich natürlich einbauen): ${slangTerms.join(", ")}`
    );
  }

  if (signatureTerms.length) {
    lines.push(
      `- Spezielle Wörter des Nutzers (nur wenn passend): ${signatureTerms.join(", ")}`
    );
  }

  if (slangPhrases.length) {
    lines.push(
      `- Wiederkehrende Slang-Formulierungen: ${slangPhrases.map((p) => `"${p}"`).join(", ")}`
    );
  }

  lines.push(
    "- Nicht übertreiben. Keine erzwungenen Slang-Wörter in jedem Satz."
  );

  return {
    stylePrompt: lines.join("\n"),
    frequentTerms: [...slangTerms, ...signatureTerms, ...slangPhrases]
  };
}

async function fetchRecentUserMessages(
  admin: SupabaseClient,
  userId: string,
  limit = 40
) {
  const { data, error } = await admin
    .from("chat_messages")
    .select("user_message")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? [])
    .map((row) => row.user_message as string)
    .filter(Boolean)
    .reverse();
}

export async function refreshUserCommunicationStyle(
  admin: SupabaseClient,
  userId: string
) {
  const messages = await fetchRecentUserMessages(admin, userId);
  const { stylePrompt, frequentTerms } = analyzeCommunicationStyle(messages);

  const { data: existing } = await admin
    .from("user_communication_style")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    user_id: userId,
    enabled: existing?.enabled ?? true,
    style_prompt: stylePrompt,
    frequent_terms: frequentTerms,
    analyzed_messages: messages.filter(isUsefulMessage).length,
    updated_at: new Date().toISOString()
  };

  const { error } = await admin.from("user_communication_style").upsert(payload);

  if (error && isMissingTableError(error.message)) {
    return null;
  }

  return payload;
}

export async function getUserCommunicationStyle(
  admin: SupabaseClient,
  userId: string
): Promise<CommunicationStyleProfile | null> {
  const { data, error } = await admin
    .from("user_communication_style")
    .select("enabled, style_prompt, frequent_terms, analyzed_messages")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && isMissingTableError(error.message)) {
    return null;
  }

  if (error || !data) {
    const refreshed = await refreshUserCommunicationStyle(admin, userId);
    if (!refreshed) return null;

    return {
      enabled: true,
      stylePrompt: refreshed.style_prompt,
      frequentTerms: refreshed.frequent_terms ?? [],
      analyzedMessages: refreshed.analyzed_messages ?? 0
    };
  }

  return {
    enabled: data.enabled ?? true,
    stylePrompt: data.style_prompt ?? "",
    frequentTerms: (data.frequent_terms as string[] | null) ?? [],
    analyzedMessages: data.analyzed_messages ?? 0
  };
}

export async function getCommunicationStylePrompt(
  admin: SupabaseClient,
  userId: string
) {
  const profile = await getUserCommunicationStyle(admin, userId);
  if (!profile?.enabled || !profile.stylePrompt.trim()) return "";
  return (
    `${profile.stylePrompt}\n` +
    "- Match the user's writing language in every reply (Turkish, English, German, etc.)."
  );
}

export async function setCommunicationStyleEnabled(
  admin: SupabaseClient,
  userId: string,
  enabled: boolean
) {
  const current = await getUserCommunicationStyle(admin, userId);

  await admin.from("user_communication_style").upsert({
    user_id: userId,
    enabled,
    style_prompt: current?.stylePrompt ?? "",
    frequent_terms: current?.frequentTerms ?? [],
    analyzed_messages: current?.analyzedMessages ?? 0,
    updated_at: new Date().toISOString()
  });
}
