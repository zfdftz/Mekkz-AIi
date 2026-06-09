const IMAGE_COMMAND =
  /^\/(?:bild|image|img|resim|gorsel|görsel|foto|photo|fotoğraf|fotograf|imagen|resmi|resme|picture|pic)\s+.+/i;

const IMAGE_NOUN =
  /\b(bild(?:er)?|foto(?:s|graf(?:ie)?)?|zeichnung(?:en)?|images?|pictures?|photos?|drawings?|illustrations?|pics?|resim(?:ler|i|imi|ine|de|den)?|g[öo]rsel(?:ler|i|ini|de)?|afbeelding(?:en)?|imagen(?:es)?|immagini?|imagens?|fotograf(?:ía|ia)?|dessins?|obraz(?:ek|u)?|zdj[ęe]ci[ea]?|obrazk(?:i|u)?|картин(?:ка|ки|ку)?|изображен(?:ие|ия|ии)?|фото|рисун(?:ок|ка|ки)|صور(?:ة|ه)?|رسم)\b/i;

const CREATE_VERB =
  /\b(mach(?:e|en|st)?|mache|erstell(?:e|en|st|ung)?|generier(?:e|en|st|ung)?|zeichn(?:e|en|st)?|mal(?:e|en|st)?|erzeug(?:e|en)?|create?s?|creating|generated?|generat(?:e|ing|ed|ion)?|draw(?:ing|s)?|paint(?:ing|s)?|design(?:ing|s|e)?|make?s?|making|show|give|render(?:ing|s)?|produce?s?|yap(?:ay[ıi]m|abilir(?:sin(?:iz)?|m)?|t[ıi]r|acak|mal[ıi])?|olu[şs]tur(?:abilir(?:sin(?:iz)?|m)?|t[ıu]r|acak|ulur|ma)?|olustur(?:abilir(?:sin(?:iz)?|m)?|tur|acak|ma)?|[çc]iz(?:er|eyim|ebilir(?:sin(?:iz)?|m)?|im)?|ciz(?:er|eyim|ebilir(?:sin(?:iz)?|m)?|im)?|[üu]ret(?:ebilir(?:sin(?:iz)?|m)?)?|uret(?:ebilir(?:sin(?:iz)?|m)?)?|g[öo]ster(?:ebilir(?:sin(?:iz)?|m)?)?|goster(?:ebilir(?:sin(?:iz)?|m)?)?|haz[ıi]rla|hazirla|crea(?:r|ndo|do)?|genera(?:r|ndo|do)?|dibuja(?:r|ndo|do)?|haz(?:er|iendo|o)?|muestra(?:r|ndo|do)?|cr[ée]e(?:r|z)?|gen[èe]re(?:r|z)?|dessine(?:r|z)?|fais(?:ons|ez|ait)?|faire|montre(?:r|z)?|disegna(?:re|mi)?|fammi|fai|mostra(?:re|mi)?|cria(?:r|ndo|do)?|desenha(?:r|ndo|do)?|maak|genereer|teken|ontwerp|stw[óo]rz|generuj|narysuj|zr[óo]b|zrob|создай|сгенерируй|нарисуй|сделай|покажи|اصنع|ارسم|اعمل|أنشئ|انشئ|zeig(?:e|en)?)\b/i;

const REQUEST_WORD =
  /\b(m[öo]chte|moechte|will|w[üu]rde|wuerde|brauch(?:e|en)?|h[äa]tte|haette|want|need|would like|please|bitte|quiero|necesito|podr[íi]as|podrias|puedes|je veux|j'aimerais|peux-tu|pourrais-tu|istiyorum|laz[ıi]m|lazim|gerek|istiyor(?:um|uz)|l[üu]tfen|lutfen|kannst du|k[öo]nntest du|koenntest du|could you|can you|kann(?:st)?(?:\s+du)?)\b/i;

const SUBJECT_OF =
  /\b(?:photo|picture|image|pic|bild|foto|resim|g[öo]rsel|gorsel|imagen|illustration|drawing)s?\b[^.?!]{0,24}\b(?:of|of an|of a|of the|von|vom|de|di|con|sobre|i[çc]in|icin)\b/i;

const NOT_GENERATION =
  /^(what|was|wie|what's|whats|explain|describe|analyze|analysiere|erkl[äa]re|erklar|tell me about|who|when|where|why|wer|wann|wo|warum)\b/i;

const PROMPT_PREFIXES: RegExp[] = [
  /^(bitte\s+)?(erstell(?:e|en)|generier(?:e|en)|zeichn(?:e|en)|mal(?:e|en)|erzeuge|mach(?:e|en)?|mache|create|generate|draw|paint|design(?:e|en)?|make|show|give|render|produce|zeig(?:e|en)?)\s+(mir\s+|me\s+|bana\s+)?(ein\s+|a\s+|an\s+|the\s+|bir\s+|bi\s+)?(bild|foto|image|picture|photo|zeichnung|resim|görsel|gorsel|fotoğraf|fotograf|imagen|foto|dessin|immagine|imagem|afbeelding|obraz|zdjęcie|zdjecie|resmi|görseli|gorseli|pic|pics?)\s*(von|vom|of|of an|of a|of the|de|du|di|yap|için|icin|:|–|-)?\s*/i,
  /^(bitte\s+)?(will|würde|wuerde|brauch(?:e|en)?|möchte|moechte|hätte|haette|want|need|would like|quiero|necesito|je veux|voglio|preciso|istiyorum)\s+(mir\s+|me\s+|bana\s+)?(ein\s+|a\s+|an\s+|the\s+|bir\s+|bi\s+)?(bild|foto|image|picture|photo|zeichnung|resim|görsel|gorsel|fotoğraf|fotograf|imagen|foto|dessin|immagine|imagem|resmi|görseli|gorseli|pic|pics?)\s*(von|vom|of|of an|of a|of the|de|du|di|yap|için|icin|:|–|-)?\s*/i,
  /^(bitte\s+)?(kannst du|könntest du|koenntest du|could you|can you|podrías|podrias|peux-tu|puoi|poderia)\s+(mir\s+|me\s+|bana\s+)?(ein\s+|a\s+|an\s+|the\s+|bir\s+|bi\s+)?(bild|foto|image|picture|photo|zeichnung|resim|görsel|gorsel|fotoğraf|fotograf|imagen|foto|dessin|immagine|imagem|resmi|görseli|gorseli|pic|pics?)\s*(von|vom|of|of an|of a|of the|de|du|di|:|–|-)?\s*/i,
  /^(make|create|generate|draw|paint|design|show|give|render|produce)\s+(a\s+|an\s+|the\s+|me\s+)?(photo|picture|image|pic|drawing|illustration)\s+(of|of an|of a|of the)\s+/i,
  /^(make|create|generate|draw|paint|design|show|give|render|produce)\s+(a\s+|an\s+|the\s+)?(photo|picture|image|pic|drawing|illustration)\s+/i,
  /^(make|create|generate|draw|paint|design|show|give|render|produce)\s+(picture|photo|image|pic)\s+(of|of an|of a|of the)\s+/i,
  /^(bild|foto|zeichnung|resim|görsel|gorsel|fotoğraf|fotograf|imagen|foto|image|picture|photo|dessin|immagine|imagem|resmi|görseli|gorseli|pic)\s+(von|vom|über|ueber|mit|of|of an|of a|of the|de|du|di|con|sobre|yap|için|icin)\s+/i,
  /^(mach\s+bild|bild\s+machen|bild\s+erstellen|foto\s+machen|resim\s+yap|görsel\s+yap|gorsel\s+yap|resim\s+oluştur|resim\s+olustur)\s*(von|vom|of|of an|of a|of the|de|du|di|:|–|-)?\s*/i,
  /^(bana\s+)?(bir\s+|bi\s+)?(resim|görsel|gorsel|fotoğraf|fotograf|resmi|görseli|gorseli)\s+(yap|oluştur|olustur|çiz|ciz|ver|göster|goster)\s*/i,
  /^ich\s+(?:will|möchte|moechte|brauche)\s+(?:ein\s+|a\s+|an\s+)?(bild|foto|image|picture|photo|resim)\s*(von|vom|of|of an|of a|of the)?\s*/i
];

function normalizeImageText(text: string) {
  return text.trim().normalize("NFKC");
}

export function containsImageNoun(text: string) {
  return IMAGE_NOUN.test(normalizeImageText(text));
}

function isClearlyNotGeneration(text: string) {
  const normalized = normalizeImageText(text);
  if (!normalized) return true;
  if (NOT_GENERATION.test(normalized) && !CREATE_VERB.test(normalized)) return true;
  if (/\b(describe|analyze|analysiere|what is|was ist|explain|erkl[äa]re)\b/i.test(normalized) && !CREATE_VERB.test(normalized)) {
    return true;
  }
  return false;
}

export function wantsImageGeneration(text: string) {
  const normalized = normalizeImageText(text);
  if (!normalized || isClearlyNotGeneration(normalized)) return false;
  if (IMAGE_COMMAND.test(normalized)) return true;
  if (!containsImageNoun(normalized)) return false;

  if (CREATE_VERB.test(normalized)) return true;
  if (REQUEST_WORD.test(normalized)) return true;
  if (SUBJECT_OF.test(normalized)) return true;

  if (
    /^(make|create|generate|draw|paint|design|show|give|render|produce|mach|erstell|generier|zeichn|mal|yap|oluştur|olustur|çiz|ciz)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

function stripCommandPrefix(text: string) {
  const commands = [
    "/bild ",
    "/image ",
    "/img ",
    "/picture ",
    "/pic ",
    "/photo ",
    "/resim ",
    "/gorsel ",
    "/görsel ",
    "/foto ",
    "/fotoğraf ",
    "/fotograf ",
    "/imagen ",
    "/resmi ",
    "/resme "
  ];
  const lower = text.toLowerCase();
  for (const command of commands) {
    if (lower.startsWith(command)) {
      return text.slice(command.length).trim();
    }
  }
  return text;
}

export function extractImagePrompt(text: string) {
  const trimmed = stripCommandPrefix(normalizeImageText(text));

  let cleaned = trimmed;
  for (const prefix of PROMPT_PREFIXES) {
    cleaned = cleaned.replace(prefix, "");
  }

  cleaned = cleaned
    .replace(
      /\b(bitte|please|l[üu]tfen|lutfen|bana|mir|me|a|an|the|ein|eine|einer|einem|einen|bir|bi)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || trimmed;
}
