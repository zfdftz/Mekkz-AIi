export const LANGUAGE_COOKIE = "mekkz_lang";
export const LANGUAGE_STORAGE_KEY = "mekkz_lang";
export const DEFAULT_LANGUAGE = "en" as const;

export type LanguageCode =
  | "de"
  | "en"
  | "es"
  | "fr"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "tr"
  | "ru"
  | "uk"
  | "ar"
  | "zh"
  | "ja"
  | "ko"
  | "hi"
  | "sv"
  | "no"
  | "da"
  | "fi"
  | "el"
  | "cs"
  | "ro"
  | "hu"
  | "id"
  | "th"
  | "vi"
  | "he"
  | "fa"
  | "bn"
  | "ms"
  | "fil"
  | "sk"
  | "hr"
  | "sr"
  | "bg"
  | "lt"
  | "lv"
  | "et"
  | "sl"
  | "ca"
  | "sw";

export type LanguageOption = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "pl", label: "Polish", nativeLabel: "Polski" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "uk", label: "Ukrainian", nativeLabel: "Українська" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "sv", label: "Swedish", nativeLabel: "Svenska" },
  { code: "no", label: "Norwegian", nativeLabel: "Norsk" },
  { code: "da", label: "Danish", nativeLabel: "Dansk" },
  { code: "fi", label: "Finnish", nativeLabel: "Suomi" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά" },
  { code: "cs", label: "Czech", nativeLabel: "Čeština" },
  { code: "ro", label: "Romanian", nativeLabel: "Română" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
  { code: "th", label: "Thai", nativeLabel: "ไทย" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu" },
  { code: "fil", label: "Filipino", nativeLabel: "Filipino" },
  { code: "sk", label: "Slovak", nativeLabel: "Slovenčina" },
  { code: "hr", label: "Croatian", nativeLabel: "Hrvatski" },
  { code: "sr", label: "Serbian", nativeLabel: "Српски" },
  { code: "bg", label: "Bulgarian", nativeLabel: "Български" },
  { code: "lt", label: "Lithuanian", nativeLabel: "Lietuvių" },
  { code: "lv", label: "Latvian", nativeLabel: "Latviešu" },
  { code: "et", label: "Estonian", nativeLabel: "Eesti" },
  { code: "sl", label: "Slovenian", nativeLabel: "Slovenščina" },
  { code: "ca", label: "Catalan", nativeLabel: "Català" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili" }
];

const LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));

const COUNTRY_TO_LANGUAGE: Record<string, LanguageCode> = {
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  LU: "de",
  US: "en",
  GB: "en",
  AU: "en",
  CA: "en",
  NZ: "en",
  IE: "en",
  ZA: "en",
  IN: "hi",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  VE: "es",
  FR: "fr",
  BE: "fr",
  IT: "it",
  PT: "pt",
  BR: "pt",
  NL: "nl",
  PL: "pl",
  TR: "tr",
  RU: "ru",
  BY: "ru",
  KZ: "ru",
  UA: "uk",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  MA: "ar",
  DZ: "ar",
  CN: "zh",
  TW: "zh",
  HK: "zh",
  SG: "en",
  JP: "ja",
  KR: "ko",
  SE: "sv",
  NO: "no",
  DK: "da",
  FI: "fi",
  GR: "el",
  CZ: "cs",
  RO: "ro",
  HU: "hu",
  ID: "id",
  TH: "th",
  VN: "vi",
  IL: "he",
  IR: "fa",
  BD: "bn",
  MY: "ms",
  PH: "fil",
  SK: "sk",
  HR: "hr",
  RS: "sr",
  BG: "bg",
  LT: "lt",
  LV: "lv",
  EE: "et",
  SI: "sl",
  KE: "sw",
  TZ: "sw"
};

const LANGUAGE_AI_NAMES: Record<LanguageCode, string> = {
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  ru: "Russian",
  uk: "Ukrainian",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  el: "Greek",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  id: "Indonesian",
  th: "Thai",
  vi: "Vietnamese",
  he: "Hebrew",
  fa: "Persian",
  bn: "Bengali",
  ms: "Malay",
  fil: "Filipino",
  sk: "Slovak",
  hr: "Croatian",
  sr: "Serbian",
  bg: "Bulgarian",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
  sl: "Slovenian",
  ca: "Catalan",
  sw: "Swahili"
};

export function isSupportedLanguage(value: string | null | undefined): value is LanguageCode {
  return Boolean(value && LANGUAGE_CODES.has(value as LanguageCode));
}

export function normalizeLanguage(value: string | null | undefined): LanguageCode {
  if (!value) return DEFAULT_LANGUAGE;
  const lower = value.trim().toLowerCase();
  const base = lower.split("-")[0];
  if (isSupportedLanguage(base)) return base;
  if (isSupportedLanguage(lower)) return lower;
  return DEFAULT_LANGUAGE;
}

export function languageFromCountry(countryCode: string | null | undefined): LanguageCode {
  if (!countryCode) return DEFAULT_LANGUAGE;
  return COUNTRY_TO_LANGUAGE[countryCode.trim().toUpperCase()] ?? DEFAULT_LANGUAGE;
}

export function languageFromAcceptLanguage(header: string | null | undefined): LanguageCode {
  if (!header) return DEFAULT_LANGUAGE;

  for (const part of header.split(",")) {
    const token = part.trim().split(";")[0]?.trim();
    if (!token) continue;
    const normalized = normalizeLanguage(token);
    if (normalized !== DEFAULT_LANGUAGE || token.toLowerCase().startsWith("en")) {
      return normalized;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function countryFromRequest(req: Request) {
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code") ||
    null
  );
}

export function detectLanguageFromRequest(req: Request): LanguageCode {
  const country = countryFromRequest(req);
  if (country) {
    return languageFromCountry(country);
  }
  return languageFromAcceptLanguage(req.headers.get("accept-language"));
}

export function getLanguageLabel(code: LanguageCode) {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.nativeLabel ?? code;
}

export function getLanguageAiName(code: LanguageCode) {
  return LANGUAGE_AI_NAMES[code] ?? "English";
}

const TURKISH_HINT =
  /\b(bir|ve|için|icin|nedir|konusu|dizi|var|mi|mı|mu|mü|de|da|ile|bu|şu|su|ne|nasıl|nasil|merhaba|teşekkür|tesekkur|görsel|gorsel|resim|hakkında|hakkinda|oyuncu|bölüm|bolum|adı|adi|yeni|daha|içeriği|icerigi|hangi|gün|gun|yayın|yayin|olsun|olur|evet|hayır|hayir)\b|[çğıöşüÇĞİÖŞÜ]/i;

const GERMAN_HINT =
  /\b(der|die|das|und|ist|nicht|ein|eine|ich|du|wir|für|fur|wie|was|kann|bitte|bild|chat|oder|auch|warum|wann|wo|habe|hast|sein|sind|dein|deine|melde|anmelden)\b|[äöüßÄÖÜ]/i;

/** Detect language from what the user actually wrote — not UI settings. */
export function detectLanguageFromText(text: string): LanguageCode | null {
  const sample = text.trim().slice(0, 800);
  if (sample.length < 2) return null;

  let tr = 0;
  let de = 0;

  if (TURKISH_HINT.test(sample)) tr += 3;
  if (GERMAN_HINT.test(sample)) de += 3;
  if (/[çğıöşüÇĞİÖŞÜ]/.test(sample)) tr += 4;
  if (/[äöüßÄÖÜ]/.test(sample)) de += 4;

  if (tr > de && tr >= 3) return "tr";
  if (de > tr && de >= 3) return "de";
  if (/\b(the|and|what|how|why|when|where|please|thanks|hello|you|your)\b/i.test(sample)) {
    return "en";
  }
  return null;
}

export function buildReplyLanguageLock(language: LanguageCode) {
  const name = getLanguageAiName(language);
  return (
    `FINAL RULE (overrides everything above): The user's latest message is in ${name}. ` +
    `Write your ENTIRE reply in ${name} only — every sentence. ` +
    `Never reply in German if the user wrote in ${name}. ` +
    `Internal plan/billing notes above may be in German — translate them into ${name} for the user.`
  );
}

export function buildLanguageSystemPrompt() {
  return (
    "LANGUAGE RULE (highest priority): Always reply in the same language as the user's latest message. " +
    "Turkish message → Turkish reply. English message → English reply. German → German. Any language → match it. " +
    "If the user switches language mid-chat, switch with them. Never force the app UI language into chat replies. " +
    "Keep a concise, direct, premium tone. " +
    "GENERAL KNOWLEDGE: Answer questions about TV series, films, news, people, and everyday topics helpfully. " +
    "Do not refuse with 'I have no information' or 'I cannot find' — use your knowledge and any web context provided below. " +
    "If unsure, give the best helpful summary you can and note when details may have changed. " +
    "If the user asks your name or identity: say naturally that you are MEKKZ AI and help with chat, images, and questions here. " +
    "Never claim to be ChatGPT, Claude, Groq, or another brand. " +
    "For normal text questions, prefer short answers (about 2-5 sentences) unless the user asks for detail."
  );
}

export function buildImageAnalysisLanguagePrompt() {
  return (
    "The user sent an image. Answer in the same language as their message about the image — plain text only, no section headers, " +
    "no labels like Category/Content/Colors/Details, no bullet lists unless the user asked for them. " +
    "Respond to their question directly. Do not offer to generate a new image unless they explicitly ask."
  );
}

export function buildVisionFallbackPrompt() {
  return "Answer briefly and naturally in the same language as the user's message about their image.";
}
