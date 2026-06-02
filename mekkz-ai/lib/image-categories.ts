export type ImageCategoryId =
  | "landscape"
  | "person"
  | "animal"
  | "food"
  | "document"
  | "screenshot"
  | "art"
  | "object"
  | "generated"
  | "other";

export const IMAGE_CATEGORIES: Record<
  ImageCategoryId,
  { label: string; badgeClass: string; borderClass: string }
> = {
  landscape: {
    label: "Landschaft",
    badgeClass: "bg-emerald-500/20 text-emerald-100",
    borderClass: "border-emerald-400/40"
  },
  person: {
    label: "Person",
    badgeClass: "bg-sky-500/20 text-sky-100",
    borderClass: "border-sky-400/40"
  },
  animal: {
    label: "Tier",
    badgeClass: "bg-amber-500/20 text-amber-100",
    borderClass: "border-amber-400/40"
  },
  food: {
    label: "Essen",
    badgeClass: "bg-orange-500/20 text-orange-100",
    borderClass: "border-orange-400/40"
  },
  document: {
    label: "Dokument",
    badgeClass: "bg-violet-500/20 text-violet-100",
    borderClass: "border-violet-400/40"
  },
  screenshot: {
    label: "Screenshot",
    badgeClass: "bg-slate-500/20 text-slate-100",
    borderClass: "border-slate-400/40"
  },
  art: {
    label: "Kunst",
    badgeClass: "bg-fuchsia-500/20 text-fuchsia-100",
    borderClass: "border-fuchsia-400/40"
  },
  object: {
    label: "Objekt",
    badgeClass: "bg-cyan-500/20 text-cyan-100",
    borderClass: "border-cyan-400/40"
  },
  generated: {
    label: "Generiert",
    badgeClass: "bg-indigo-500/20 text-indigo-100",
    borderClass: "border-indigo-400/40"
  },
  other: {
    label: "Sonstiges",
    badgeClass: "bg-white/10 text-fg",
    borderClass: "border-white/20"
  }
};

const LABEL_TO_ID: Record<string, ImageCategoryId> = {
  landschaft: "landscape",
  landscape: "landscape",
  person: "person",
  mensch: "person",
  portrait: "person",
  tier: "animal",
  animal: "animal",
  essen: "food",
  food: "food",
  dokument: "document",
  document: "document",
  screenshot: "screenshot",
  kunst: "art",
  art: "art",
  objekt: "object",
  object: "object",
  generiert: "generated",
  generated: "generated",
  sonstiges: "other",
  other: "other"
};

export function normalizeCategoryId(value?: string | null): ImageCategoryId {
  if (!value) return "other";
  const key = value.trim().toLowerCase();
  return LABEL_TO_ID[key] ?? "other";
}

export function categorizeFromText(text: string, fallback: ImageCategoryId = "other") {
  const t = text.toLowerCase();

  if (/person|mensch|portrait|gesicht|selfie|mann|frau|kind/.test(t)) return "person";
  if (/tier|hund|katze|vogel|pferd|animal|cat|dog/.test(t)) return "animal";
  if (/essen|food|pizza|burger|kuchen|gericht|restaurant/.test(t)) return "food";
  if (/landschaft|berg|meer|sonnenuntergang|wald|natur|beach|mountain|sunset/.test(t))
    return "landscape";
  if (/screenshot|bildschirm|ui|app|fenster|desktop/.test(t)) return "screenshot";
  if (/dokument|text|pdf|rechnung|vertrag|brief|scan/.test(t)) return "document";
  if (/logo|design|zeichnung|malerei|kunst|artwork|illustration/.test(t)) return "art";
  if (/auto|car|haus|phone|objekt|produkt|machine|werkzeug/.test(t)) return "object";

  return fallback;
}

export function categorizeUploadedImage(fileName?: string, userText?: string) {
  const name = (fileName || "").toLowerCase();
  const text = (userText || "").toLowerCase();

  if (/screenshot|screen|bildschirm|capture/.test(name)) return "screenshot";
  if (/scan|doc|pdf|rechnung|invoice/.test(name)) return "document";

  return categorizeFromText(`${name} ${text}`, "other");
}

export function categorizeGeneratedPrompt(prompt: string) {
  return categorizeFromText(prompt, "generated");
}

export function parseCategoryFromAnalysis(text: string): ImageCategoryId | null {
  const match = text.match(/\*\*Kategorie:\*\*\s*([^\n*]+)/i);
  if (!match?.[1]) return null;
  return normalizeCategoryId(match[1]);
}

export function parseAnalysisSections(text: string) {
  const parts = text.split(/\*\*(.+?):\*\*/).map((part) => part.trim());
  if (parts.length < 3) return null;

  const sections: { title: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i];
    const body = parts[i + 1]?.replace(/\n+$/g, "").trim();
    if (title && body) sections.push({ title, body });
  }

  return sections.length > 0 ? sections : null;
}

export function getCategoryMeta(id?: string | null) {
  return IMAGE_CATEGORIES[normalizeCategoryId(id)];
}
