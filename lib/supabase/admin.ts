import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: SupabaseClient | null = null;

function normalizeSupabaseUrl(raw: string) {
  const url = raw.trim().replace(/^["']|["']$/g, "");
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url.replace(/^\/+/, "")}`;
  }
  return url;
}

function isValidSupabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

export function createAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !key) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const url = normalizeSupabaseUrl(rawUrl);
  if (!isValidSupabaseUrl(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ist ungültig. In Vercel muss z. B. https://DEIN-PROJEKT.supabase.co stehen (nicht prj_ oder prod_)."
    );
  }

  if (!cachedAdmin) {
    cachedAdmin = createClient(url, key);
  }

  return cachedAdmin;
}
