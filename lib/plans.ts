export type PlanId = "free" | "plus" | "pro" | "ultra";

export const PAID_PLAN_IDS = ["plus", "pro", "ultra"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

/** ChatGPT-style limit per conversation (user message pairs). */
export const CHATGPT_MESSAGES_PER_CHAT = 40;

/** Monatspreise in Cent (Stripe / Abrechnung). */
export const PLAN_MONTHLY_CENTS: Record<PaidPlanId, number> = {
  plus: 300,
  pro: 1000,
  ultra: 2900
};

export function isPaidPlanId(plan: string | null | undefined): plan is PaidPlanId {
  return plan === "plus" || plan === "pro" || plan === "ultra";
}

export function planRank(plan: PlanId) {
  if (plan === "ultra") return 3;
  if (plan === "pro") return 2;
  if (plan === "plus") return 1;
  return 0;
}

export function planUpgradeDifferenceCentsBetween(from: PaidPlanId, to: PaidPlanId) {
  return PLAN_MONTHLY_CENTS[to] - PLAN_MONTHLY_CENTS[from];
}

export function planUpgradeDifferenceCents() {
  return planUpgradeDifferenceCentsBetween("pro", "ultra");
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
    textReadyDelayMs: 600,
    description: "7 Bilder erstellen, 5 Bilder an mekkz AI senden pro Tag."
  },
  plus: {
    id: "plus",
    label: "Plus",
    priceLabel: "3 € / Monat",
    dailyImageLimit: 7,
    dailyUploadLimit: 9,
    messagesPerChatLimit: 50,
    imageReadyDelayMs: 850,
    textReadyDelayMs: 180,
    description: "50 Nachrichten pro Chat, 7 Bilder erstellen, 9 senden, etwas schneller als Free."
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
  if (isPaidPlanId(plan)) return PLANS[plan];
  return PLANS.free;
}

/** Für KI-Systemprompt — exakte Limits aller Tarife. */
export function buildPlansLimitsReference() {
  return (
    "OFFIZIELLE LIMIT-TABELLE (niemals andere Zahlen erfinden — Free hat NICHT 10 Bilder):\n" +
    `- Free: ${PLANS.free.dailyImageLimit} Bilder erstellen/Tag, ${PLANS.free.dailyUploadLimit} Bilder senden (hochladen)/Tag, ${PLANS.free.messagesPerChatLimit} Nachrichten/Chat\n` +
    `- Plus: ${PLANS.plus.dailyImageLimit} erstellen, ${PLANS.plus.dailyUploadLimit} senden, ${PLANS.plus.messagesPerChatLimit} Nachrichten/Chat\n` +
    `- Pro: ${PLANS.pro.dailyImageLimit} erstellen, ${PLANS.pro.dailyUploadLimit} senden, ${PLANS.pro.messagesPerChatLimit} Nachrichten/Chat\n` +
    `- Ultra: ${PLANS.ultra.dailyImageLimit} erstellen, ${PLANS.ultra.dailyUploadLimit} senden, unbegrenzt Nachrichten/Chat`
  );
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
