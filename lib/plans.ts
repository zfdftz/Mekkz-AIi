export type PlanId = "free" | "pro" | "ultra";

/** ChatGPT-style limit per conversation (user message pairs). */
export const CHATGPT_MESSAGES_PER_CHAT = 40;

/** Monatspreise in Cent (Stripe / Abrechnung). */
export const PLAN_MONTHLY_CENTS: Record<Exclude<PlanId, "free">, number> = {
  pro: 1000,
  ultra: 2900
};

export function planUpgradeDifferenceCents() {
  return PLAN_MONTHLY_CENTS.ultra - PLAN_MONTHLY_CENTS.pro;
}

export type PlanInfo = {
  id: PlanId;
  label: string;
  priceLabel: string;
  dailyImageLimit: number | null;
  dailyUploadLimit: number | null;
  messagesPerChatLimit: number | null;
  imageReadyDelayMs: number;
  textReadyDelayMs: number;
  description: string;
};

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: "free",
    label: "Free Version",
    priceLabel: "0 €",
    dailyImageLimit: 7,
    dailyUploadLimit: 5,
    messagesPerChatLimit: CHATGPT_MESSAGES_PER_CHAT,
    imageReadyDelayMs: 1200,
    textReadyDelayMs: 0,
    description: "7 Bilder erstellen, 5 Bilder an mekkz AI senden pro Tag."
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceLabel: "10 € / Monat",
    dailyImageLimit: 20,
    dailyUploadLimit: 20,
    messagesPerChatLimit: CHATGPT_MESSAGES_PER_CHAT * 2,
    imageReadyDelayMs: 400,
    textReadyDelayMs: 0,
    description: "Schnellere Bildgenerierung, 20 Bilder erstellen, 20 Bilder senden pro Tag."
  },
  ultra: {
    id: "ultra",
    label: "Ultra",
    priceLabel: "29 € / Monat",
    dailyImageLimit: 35,
    dailyUploadLimit: 40,
    messagesPerChatLimit: null,
    imageReadyDelayMs: 0,
    textReadyDelayMs: 0,
    description: "Noch schnellere Bildgenerierung, 35 Bilder erstellen, 40 Bilder senden pro Tag."
  }
};

export function getPlanInfo(plan: string): PlanInfo {
  if (plan === "pro" || plan === "ultra") return PLANS[plan];
  return PLANS.free;
}

/** Für KI-Systemprompt — exakte Limits aller Tarife. */
export function buildPlansLimitsReference() {
  return (
    "OFFIZIELLE LIMIT-TABELLE (niemals andere Zahlen erfinden — Free hat NICHT 10 Bilder):\n" +
    `- Free: ${PLANS.free.dailyImageLimit} Bilder erstellen/Tag, ${PLANS.free.dailyUploadLimit} Bilder senden (hochladen)/Tag, ${PLANS.free.messagesPerChatLimit} Nachrichten/Chat\n` +
    `- Pro: ${PLANS.pro.dailyImageLimit} erstellen, ${PLANS.pro.dailyUploadLimit} senden, ${PLANS.pro.messagesPerChatLimit} Nachrichten/Chat\n` +
    `- Ultra: ${PLANS.ultra.dailyImageLimit} erstellen, ${PLANS.ultra.dailyUploadLimit} senden, unbegrenzt Nachrichten/Chat`
  );
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
