import { SupabaseClient } from "@supabase/supabase-js";

export type MemoryCategory =
  | "general"
  | "preference"
  | "interest"
  | "fact"
  | "conversation";

export type MemorySource = "auto" | "manual" | "learned";

export type UserMemory = {
  id: string;
  user_id: string;
  memory: string;
  category: MemoryCategory;
  source: MemorySource;
  importance: number;
  created_at: string;
};

const MAX_MEMORIES_PER_USER = 50;
const PROMPT_MEMORY_LIMIT = 15;

function isMissingColumnError(message: string) {
  return /column|does not exist|schema cache/i.test(message);
}

function isMissingTableError(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
}

function normalizeMemoryText(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 400);
}

function memoryKey(text: string) {
  return normalizeMemoryText(text).toLowerCase();
}

type ExtractedMemory = {
  memory: string;
  category: MemoryCategory;
  importance: number;
};

const EXTRACTION_PATTERNS: Array<{
  regex: RegExp;
  category: MemoryCategory;
  importance: number;
  pick: (match: RegExpMatchArray) => string;
}> = [
  {
    regex: /\b(?:remember|save|store|merk(?:e)? dir|speicher(?:e)?)\s*(?:that|dass|:)?\s*(.+)/i,
    category: "fact",
    importance: 3,
    pick: (m) => m[1]
  },
  {
    regex: /\b(?:my name is|i am called|call me|ich hei(?:ß|ss)e|nenn(?:e)? mich)\s+(.+)/i,
    category: "fact",
    importance: 4,
    pick: (m) => `Name: ${m[1]}`
  },
  {
    regex: /\b(?:i (?:like|love|prefer|enjoy)|ich (?:mag|liebe|bevorzuge))\s+(.+)/i,
    category: "preference",
    importance: 3,
    pick: (m) => `Preference: ${m[1]}`
  },
  {
    regex: /\b(?:i (?:work as|am a)|ich (?:arbeite als|bin))\s+(.+)/i,
    category: "fact",
    importance: 3,
    pick: (m) => `Work: ${m[1]}`
  },
  {
    regex: /\b(?:i live in|i am from|ich wohne in|ich komme aus)\s+(.+)/i,
    category: "fact",
    importance: 3,
    pick: (m) => `Location: ${m[1]}`
  },
  {
    regex: /\b(?:my hobby is|my hobbies are|mein hobby ist|meine hobbies sind)\s+(.+)/i,
    category: "interest",
    importance: 2,
    pick: (m) => `Interest: ${m[1]}`
  }
];

export function extractMemoriesFromText(text: string): ExtractedMemory[] {
  const clean = text.trim();
  if (clean.length < 8) return [];

  const results: ExtractedMemory[] = [];
  const seen = new Set<string>();

  for (const pattern of EXTRACTION_PATTERNS) {
    const match = clean.match(pattern.regex);
    if (!match) continue;
    const memory = normalizeMemoryText(pattern.pick(match));
    if (memory.length < 4) continue;
    const key = memoryKey(memory);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      memory,
      category: pattern.category,
      importance: pattern.importance
    });
  }

  // Fallback: short factual statements with personal pronouns
  if (
    results.length === 0 &&
    /\b(i am|i'm|ich bin|my |mein |meine )\b/i.test(clean) &&
    clean.length <= 160 &&
    !/\?/.test(clean)
  ) {
    results.push({
      memory: normalizeMemoryText(clean),
      category: "general",
      importance: 1
    });
  }

  return results;
}

export async function listUserMemories(
  admin: SupabaseClient,
  userId: string,
  limit = 50,
  options?: { includeLearned?: boolean }
): Promise<UserMemory[]> {
  const includeLearned = options?.includeLearned ?? true;
  const { data, error } = await admin
    .from("user_memory")
    .select("id, user_id, memory, category, source, importance, created_at")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error.message) || isMissingColumnError(error.message)) {
      const fallback = await admin
        .from("user_memory")
        .select("id, user_id, memory, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (fallback.error) return [];
      return (fallback.data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        memory: row.memory,
        category: "general" as const,
        source: "auto" as const,
        importance: 1,
        created_at: row.created_at
      }));
    }
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => includeLearned || (row as UserMemory).source !== "learned")
    .map((row) => row as UserMemory);
}

/** Memories shown in settings UI — hidden learned slang/facts stay internal only. */
export async function listVisibleUserMemories(
  admin: SupabaseClient,
  userId: string,
  limit = 50
) {
  return listUserMemories(admin, userId, limit, { includeLearned: false });
}

function formatMemoryDate(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso.slice(0, 10);
  }
}

export async function getMemoriesForPrompt(
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  const memories = await listUserMemories(admin, userId, PROMPT_MEMORY_LIMIT);
  if (memories.length === 0) return "";
  return memories
    .map((m) => `- [${formatMemoryDate(m.created_at)} · ${m.category}] ${m.memory}`)
    .join("\n");
}

export async function saveUserMemory(
  admin: SupabaseClient,
  userId: string,
  memory: string,
  options?: {
    category?: MemoryCategory;
    source?: MemorySource;
    importance?: number;
  }
) {
  const normalized = normalizeMemoryText(memory);
  if (!normalized) throw new Error("Memory text is empty.");

  const existing = await listUserMemories(admin, userId, MAX_MEMORIES_PER_USER);
  const key = memoryKey(normalized);
  const duplicate = existing.find((m) => memoryKey(m.memory) === key);

  const payload = {
    user_id: userId,
    memory: normalized,
    category: options?.category ?? "general",
    source: options?.source ?? "manual",
    importance: options?.importance ?? 2
  };

  if (duplicate) {
    const { error } = await admin
      .from("user_memory")
      .update(payload)
      .eq("id", duplicate.id);
    if (error) throw new Error(error.message);
    return duplicate.id;
  }

  if (existing.length >= MAX_MEMORIES_PER_USER) {
    const oldest = existing[existing.length - 1];
    if (oldest) {
      await admin.from("user_memory").delete().eq("id", oldest.id);
    }
  }

  const { data, error } = await admin
    .from("user_memory")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (isMissingColumnError(error.message)) {
      const { data: legacy, error: legacyError } = await admin
        .from("user_memory")
        .insert({ user_id: userId, memory: normalized })
        .select("id")
        .single();
      if (legacyError) throw new Error(legacyError.message);
      return legacy?.id as string;
    }
    throw new Error(error.message);
  }

  return data.id as string;
}

export async function autoSaveMemoriesFromMessage(
  admin: SupabaseClient,
  userId: string,
  text: string
) {
  const extracted = extractMemoriesFromText(text);
  for (const item of extracted) {
    try {
      await saveUserMemory(admin, userId, item.memory, {
        category: item.category,
        source: "auto",
        importance: item.importance
      });
    } catch {
      // Best-effort memory extraction.
    }
  }
}

export async function deleteUserMemory(
  admin: SupabaseClient,
  userId: string,
  memoryId: string
) {
  const { error } = await admin
    .from("user_memory")
    .delete()
    .eq("user_id", userId)
    .eq("id", memoryId);

  if (error) throw new Error(error.message);
}

export async function clearUserMemories(admin: SupabaseClient, userId: string) {
  const { error } = await admin
    .from("user_memory")
    .delete()
    .eq("user_id", userId)
    .neq("source", "learned");
  if (error) {
    if (isMissingColumnError(error.message)) {
      const fallback = await admin.from("user_memory").delete().eq("user_id", userId);
      if (fallback.error) throw new Error(fallback.error.message);
      return;
    }
    throw new Error(error.message);
  }
}

export function buildMemorySystemPrompt(memoryBlock: string) {
  if (!memoryBlock.trim()) {
    return (
      "Long-term memory: none saved yet. When the user shares stable preferences, interests, or facts, acknowledge them naturally."
    );
  }

  return (
    "Long-term memory about this user (use naturally when relevant — do not list them unprompted):\n" +
    memoryBlock
  );
}
