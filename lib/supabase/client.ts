"use client";

import { createBrowserClient } from "@supabase/ssr";

function normalizePublicSupabaseUrl(raw: string) {
  const url = raw.trim().replace(/^["']|["']$/g, "");
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url.replace(/^\/+/, "")}`;
  }
  return url;
}

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !anonKey) {
    throw new Error(
      "Supabase-URL fehlt im Frontend-Build. In Vercel NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen, dann Redeploy."
    );
  }

  const url = normalizePublicSupabaseUrl(rawUrl);
  if (!url.includes(".supabase.co")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ist ungültig. Es muss https://DEIN-PROJEKT.supabase.co sein."
    );
  }

  return createBrowserClient(url, anonKey);
}
