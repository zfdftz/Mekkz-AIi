import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSlangDefinitionContext } from "@/lib/web-search";
import { saveUserMemory } from "@/lib/memory";

export type SlangCorrection = {
  term: string;
  claimedMeaning: string;
};

const CORRECTION_HINT =
  /\b(no|nah|nope|wrong|incorrect|not right|that's wrong|that is wrong|actually|nein|stimmt nicht|falsch|nicht richtig|that's not|that isn't|isn't right|doesn't mean|does not mean)\b/i;

const MEANING_CLAIM =
  /\b(?:it means|means|it's short for|it is short for|stands for|heisst|heißt|bedeutet|short for)\s+["']?([^"'.!\n?]{2,120})/i;

const DEFINITION_QUESTION =
  /\b(?:what does|what's|what is|meaning of|was bedeutet|was heisst|was heißt|define|stand for|short for)\s+["']?([A-Za-z0-9.]{2,20})["']?\b/i;

const QUOTED_TERM = /["']([A-Za-z0-9.]{2,20})["']/;

function normalizeTerm(raw: string) {
  return raw.trim().replace(/^["']|["']$/g, "");
}

function normalizeMeaning(raw: string) {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+(actually|really|btw|lol)$/i, "")
    .slice(0, 120);
}

export function extractTermFromDefinitionQuestion(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(DEFINITION_QUESTION);
  if (match?.[1]) return normalizeTerm(match[1]);
  const quoted = trimmed.match(QUOTED_TERM);
  if (quoted?.[1]) return normalizeTerm(quoted[1]);
  const caps = trimmed.match(/\b([A-Z]{2,10})\b/);
  if (caps?.[1] && /\?/.test(trimmed)) return normalizeTerm(caps[1]);
  return null;
}

export function extractSlangCorrection(
  userText: string,
  priorUserTexts: string[] = []
): SlangCorrection | null {
  const text = userText.trim();
  if (text.length < 4 || !CORRECTION_HINT.test(text)) return null;

  const meaningMatch = text.match(MEANING_CLAIM);
  let claimedMeaning = meaningMatch?.[1] ? normalizeMeaning(meaningMatch[1]) : "";

  if (!claimedMeaning) {
    const trailing = text.match(
      /\b(?:no|nah|wrong|nein|falsch|stimmt nicht)[^.!?]*?\b([a-zA-Z][a-zA-Z\s'-]{1,40})\s*$/i
    );
    if (trailing?.[1]) claimedMeaning = normalizeMeaning(trailing[1]);
  }

  if (!claimedMeaning || claimedMeaning.length < 2) return null;

  let term = "";
  for (let i = priorUserTexts.length - 1; i >= 0; i--) {
    const candidate = extractTermFromDefinitionQuestion(priorUserTexts[i] ?? "");
    if (candidate) {
      term = candidate;
      break;
    }
  }

  if (!term) {
    const inline = text.match(/\b([A-Z]{2,10})\b/);
    if (inline?.[1]) term = inline[1];
  }

  if (!term) return null;
  return { term, claimedMeaning };
}

function meaningMatchesWeb(claim: string, web: string, term: string): boolean {
  const webL = web.toLowerCase();
  const claimL = claim.toLowerCase().replace(/\s+/g, " ").trim();
  const termL = term.toLowerCase();

  if (!webL.includes(termL)) return false;
  if (webL.includes(claimL)) return true;

  const claimTokens = claimL.split(/\s+/).filter((t) => t.length > 2);
  if (claimTokens.length === 0) {
    return claimL.length >= 2 && webL.includes(claimL);
  }

  const matched = claimTokens.filter((t) => webL.includes(t));
  return matched.length >= Math.max(1, Math.ceil(claimTokens.length * 0.6));
}

export async function verifySlangMeaning(term: string, claimedMeaning: string) {
  const webContext = await fetchSlangDefinitionContext(term, claimedMeaning);
  if (!webContext?.trim()) {
    return { verified: false as const, webContext: null as string | null };
  }
  const verified = meaningMatchesWeb(claimedMeaning, webContext, term);
  return { verified, webContext };
}

function formatLearnedMemory(term: string, meaning: string) {
  return `"${term.toUpperCase()}" means ${meaning} (verified slang/internet abbreviation)`;
}

export async function tryLearnVerifiedSlangCorrection(
  admin: SupabaseClient,
  userId: string,
  userText: string,
  priorUserTexts: string[]
): Promise<{ webContext: string | null; learned: boolean }> {
  const correction = extractSlangCorrection(userText, priorUserTexts);
  if (!correction) return { webContext: null, learned: false };

  const { verified, webContext } = await verifySlangMeaning(
    correction.term,
    correction.claimedMeaning
  );
  if (!verified) return { webContext, learned: false };

  try {
    await saveUserMemory(admin, userId, formatLearnedMemory(correction.term, correction.claimedMeaning), {
      category: "fact",
      source: "learned",
      importance: 5
    });
  } catch {
    return { webContext, learned: false };
  }

  return { webContext, learned: true };
}
