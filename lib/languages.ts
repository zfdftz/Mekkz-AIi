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

const LANGUAGE_HINTS: Partial<Record<LanguageCode, RegExp>> = {
  tr: /\b(bir|ve|için|icin|nedir|konusu|dizi|var|mı|mi|mu|mü|ile|bu|şu|su|nasıl|nasil|merhaba|teşekkür|tesekkur|görsel|gorsel|resim|hakkında|hakkinda|oyuncu|bölüm|bolum|adı|adi|yeni|daha|içeriği|icerigi|hangi|yayın|yayin|evet|hayır|hayir|naber|nasılsın|nasilsin|iyiyim|teşekkürler|tesekkurler|istersen|konuşabiliriz|konusabiliriz|yardımcı|yardimci)\b|[çğıöşüÇĞİÖŞÜ]/i,
  de: /\b(der|die|das|und|ist|nicht|ein|eine|ich|du|wir|für|fur|wie|was|kann|bitte|oder|auch|warum|wann|wo|habe|hast|sein|sind|dein|deine|melde|anmelden|guten|danke|hallo|dir|mir|uns)\b|[äöüßÄÖÜ]/i,
  en: /\b(the|and|what|how|why|when|where|please|thanks|thank|hello|hi|hey|you|your|are|is|can|could|would|have|help|today|doing|well|good|morning|assist|question|discuss)\b/i,
  fr: /\b(je|tu|vous|nous|ils|elles|le|la|les|un|une|des|est|pas|que|qui|comment|ça|ca|va|bien|merci|bonjour|salut|pourquoi|quoi|où|ou|avec|dans|sur|ce|cette|ne|peux|peut|très|tres|au|aux|mon|ma|mes|ton|ta|tes|chez|alors|oui|non)\b|[àâçéèêëîïôùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ]/i,
  es: /\b(hola|gracias|qué|que|como|cómo|por|para|está|esta|estoy|son|soy|tú|tu|usted|nosotros|ellos|bien|mal|dónde|donde|cuándo|cuando|porqué|porque|puedo|puede|muy|sí|si|no|día|dia)\b|[áéíóúñ¿¡]/i,
  it: /\b(ciao|grazie|come|stai|stai|sono|sei|lui|lei|noi|voi|loro|perché|perche|dove|quando|cosa|bene|male|questo|quella|molto|sì|si|no|buongiorno|aiuto)\b/i,
  pt: /\b(olá|ola|obrigado|obrigada|como|você|voce|nós|nos|eles|elas|porque|quando|onde|está|esta|estou|bem|mau|isso|aquilo|bom|dia|noite|ajuda)\b|[ãõáéíóúç]/i,
  nl: /\b(hoe|gaat|het|dank|bedankt|jij|jou|wij|zij|niet|wel|waar|wanneer|waarom|goed|dag|hallo|help|vandaag)\b/i,
  pl: /\b(jak|się|dzień|dzien|dziękuję|dziekuje|cześć|czesc|dobry|proszę|prosze|nie|tak|gdzie|kiedy|dlaczego|dzisiaj|pomoc)\b|[ąćęłńóśźż]/i,
  ru: /\b(как|что|это|привет|спасибо|пожалуйста|день|где|когда|почему|хорошо|плохо|ты|вы|мы|они|можешь|помочь)\b|[а-яёА-ЯЁ]/i,
  uk: /\b(як|що|це|привіт|дякую|будь|ласка|день|де|коли|чому|добре|ти|ви|ми|вони)\b|[а-яіїєґА-ЯІЇЄҐ]/i,
  ar: /[\u0600-\u06FF]/,
  zh: /[\u4e00-\u9fff]/,
  ja: /[\u3040-\u30ff]/,
  ko: /[\uac00-\ud7af]/,
  hi: /[\u0900-\u097F]/,
  he: /[\u0590-\u05FF]/,
  fa: /[\u0600-\u06FF]/,
  th: /[\u0E00-\u0E7F]/,
  vi: /\b(xin|chào|chao|cảm|cam|ơn|on|tôi|toi|bạn|ban|làm|lam|sao|giúp|giup|hôm|hom|nay|không|khong)\b|[ăâđêôơư]/i,
  sv: /\b(hur|mår|mar|du|jag|vi|de|tack|hej|god|dag|hjälp|hjalp|idag|varför|varfor)\b|[åäöÅÄÖ]/i,
  no: /\b(hvordan|har|du|det|jeg|vi|de|takk|hei|god|dag|hjelp|i|dag|hvorfor)\b|[æøåÆØÅ]/i,
  da: /\b(hvordan|har|du|det|jeg|vi|de|tak|hej|god|dag|hjælp|hjaelp|i|dag|hvorfor)\b|[æøåÆØÅ]/i,
  fi: /\b(miten|sinä|sina|minä|mina|me|he|kiitos|hei|hyvää|hyvaa|päivää|paivaa|apua|tänään|tanaan)\b/i,
  el: /[\u0370-\u03FF]/,
  cs: /\b(jak|se|máš|mas|děkuji|dekuji|ahoj|dobrý|dobry|den|prosím|prosim|kde|kdy|proč|proc|pomoc)\b|[áčďéěíňóřšťúůýž]/i,
  ro: /\b(salut|mulțumesc|multumesc|cum|ești|esti|eu|noi|voi|ei|bună|buna|ziua|ajutor|unde|când|cand|de|ce)\b|[ăâîșțĂÂÎȘȚ]/i,
  hu: /\b(hogyan|van|köszönöm|koszonöm|szia|jó|jo|napot|segítség|segitség|hol|mikor|miért|miert|én|en|te|mi|ti|ők|ok)\b|[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/i,
  id: /\b(halo|terima|kasih|bagaimana|apa|kabar|saya|kamu|kami|mereka|bantu|hari|ini|mengapa|di|mana)\b/i,
  ms: /\b(hai|terima|kasih|apa|khabar|saya|awak|kami|mereka|bantu|hari|ini|mengapa|di|mana)\b/i,
  fil: /\b(kumusta|salamat|paano|ano|ikaw|kami|sila|tulong|ngayon|bakit|saan)\b/i,
  sk: /\b(ako|sa|máš|mas|ďakujem|dakujem|ahoj|dobrý|dobry|deň|den|prosím|prosim|kde|kedy|prečo|preco|pomoc)\b|[áäčďéíĺľňóôŕšťúýž]/i,
  hr: /\b(kako|si|hvala|bok|dobar|dan|molim|gdje|kada|zašto|zasto|pomoć|pomoc|ja|ti|mi|oni)\b|[čćđšžČĆĐŠŽ]/i,
  sr: /\b(како|си|хвала|здраво|дobar|дан|молим|где|када|зашто|помоћ|ја|ти|ми|они)\b|[а-яА-Я]/i,
  bg: /[\u0400-\u04FF]/,
  lt: /\b(kaip|sekasi|ačiū|aciu|labas|gera|diena|prašau|prasau|kur|kada|kodėl|kodel|pagalba)\b|[ąčęėįšųūž]/i,
  lv: /\b(kā|kā|paldies|sveiki|laba|diena|lūdzu|ludzu|kur|kad|kāpēc|kapec|palīdzība|palidziba)\b|[āčēģīķļņšūž]/i,
  et: /\b(kuidas|läheb|laheb|aitäh|aitah|tere|head|päeva|paeva|palun|kus|millal|miks|abi)\b|[äöõüšž]/i,
  sl: /\b(kako|si|hvala|zdravo|dober|dan|prosim|kje|kdaj|zakaj|pomoč|pomoc|jaz|ti|mi|oni)\b|[čšžČŠŽ]/i,
  ca: /\b(hola|gràcies|gracies|com|estàs|estas|soc|ets|som|bé|be|dia|ajuda|on|quan|per|què|que)\b/i,
  sw: /\b(habari|asante|jambo|nini|wewe|sisi|wao|msaada|leo|wapi|lini|kwa|nini)\b/i
};

function scoreLanguage(code: LanguageCode, sample: string) {
  const hint = LANGUAGE_HINTS[code];
  if (!hint) return 0;
  return hint.test(sample) ? 4 : 0;
}

/** Detect language from what the user actually wrote — not UI settings. */
export function detectLanguageFromText(text: string): LanguageCode | null {
  const sample = text.trim().slice(0, 800);
  if (sample.length < 2) return null;

  let best: LanguageCode | null = null;
  let bestScore = 0;

  for (const lang of SUPPORTED_LANGUAGES) {
    const score = scoreLanguage(lang.code, sample);
    if (score > bestScore) {
      bestScore = score;
      best = lang.code;
    }
  }

  return bestScore >= 4 ? best : null;
}

/** Message language wins when detectable; otherwise UI/settings language. */
export function resolveReplyLanguage(
  userText: string,
  settingsLanguage: LanguageCode = DEFAULT_LANGUAGE
): LanguageCode {
  const fromLatest = detectLanguageFromText(userText);
  if (fromLatest) return fromLatest;
  return settingsLanguage;
}

export function buildReplyLanguageLock(language: LanguageCode) {
  const name = getLanguageAiName(language);
  return (
    `FINAL RULE (overrides everything above): Reply in ${name} only — one single answer, no duplicates. ` +
    `Write exactly ONE cohesive reply in ${name}. Never write the same answer twice in different languages. ` +
    `Never mix English with ${name} or any other language in one reply. ` +
    `Internal notes above may be in another language — never quote them; translate facts into ${name} only.`
  );
}

export function buildLanguageSystemPrompt() {
  return (
    "LANGUAGE RULE (highest priority): Always reply in the same language as the user's latest message. " +
    "Support all languages (Turkish, English, French, German, Spanish, Italian, Arabic, and every language in app settings). " +
    "French → French. Turkish → Turkish. English → English. Match any language the user writes in. " +
    "If the user switches language mid-chat, switch with them immediately. Never force German or Turkish if the user wrote something else. " +
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

const SPEECH_LOCALES: Partial<Record<LanguageCode, string>> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
  ru: "ru-RU",
  uk: "uk-UA",
  ar: "ar-SA",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN",
  sv: "sv-SE",
  no: "nb-NO",
  da: "da-DK",
  fi: "fi-FI",
  el: "el-GR",
  cs: "cs-CZ",
  ro: "ro-RO",
  hu: "hu-HU",
  id: "id-ID",
  th: "th-TH",
  vi: "vi-VN",
  he: "he-IL",
  fa: "fa-IR"
};

export function getSpeechLocale(language: LanguageCode) {
  return SPEECH_LOCALES[language] ?? "en-US";
}
