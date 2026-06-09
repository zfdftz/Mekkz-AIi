import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguageFromRequest,
  isSupportedLanguage,
  languageFromCountry,
  normalizeLanguage
} from "@/lib/languages";
import {
  buildLanguageCookie,
  getUserLanguagePreference,
  languageFromCookieHeader,
  setUserLanguagePreference
} from "@/lib/user-language";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const cookieLanguage = languageFromCookieHeader(req.headers.get("cookie"));
  let language = cookieLanguage ?? detectLanguageFromRequest(req);
  let source: "saved" | "cookie" | "detected" = cookieLanguage ? "cookie" : "detected";
  let autoDetected = !cookieLanguage;

  if (user) {
    const admin = createAdminClient();
    const saved = await getUserLanguagePreference(admin, user.id);
    if (saved?.language) {
      language = saved.language;
      source = "saved";
      autoDetected = saved.autoDetected;
    }
  }

  const response = NextResponse.json({
    language,
    source,
    autoDetected,
    languages: SUPPORTED_LANGUAGES
  });

  if (!cookieLanguage) {
    response.headers.set("Set-Cookie", buildLanguageCookie(language));
  }

  return response;
}

const updateSchema = z.object({
  language: z.string().min(2).max(8),
  autoDetected: z.boolean().optional()
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid language." }, { status: 400 });
  }

  const language = normalizeLanguage(parsed.data.language);
  if (!isSupportedLanguage(language)) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    await setUserLanguagePreference(
      admin,
      user.id,
      language,
      parsed.data.autoDetected ?? false
    );
  }

  const response = NextResponse.json({ language, saved: true });
  response.headers.set("Set-Cookie", buildLanguageCookie(language));
  return response;
}

export async function PUT(req: Request) {
  const detected = detectLanguageFromRequest(req);
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code");

  const response = NextResponse.json({
    language: detected,
    country: country?.toUpperCase() ?? null,
    countryLanguage: country ? languageFromCountry(country) : DEFAULT_LANGUAGE,
    languages: SUPPORTED_LANGUAGES
  });

  response.headers.set("Set-Cookie", buildLanguageCookie(detected));
  return response;
}
