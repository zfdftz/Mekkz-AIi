import type { LanguageCode } from "../languages";
import type { PlanId } from "../plans";
import { PLANS } from "../plans";
import { translate, type TranslationKey } from "./messages";

type Vars = Record<string, string | number>;

function t(language: LanguageCode, key: TranslationKey, vars?: Vars) {
  return translate(language, key, vars);
}

export function formatPlanDate(language: LanguageCode, iso: string) {
  const locale =
    language === "de"
      ? "de-DE"
      : language === "tr"
        ? "tr-TR"
        : language === "fr"
          ? "fr-FR"
          : language === "es"
            ? "es-ES"
            : "en-US";
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function getPlanBullets(language: LanguageCode, plan: PlanId) {
  const info = PLANS[plan];
  const createLine = t(language, "plan.bullet.imagesPerDay", {
    count: info.dailyImageLimit ?? 0
  });
  const uploadLine = t(language, "plan.bullet.uploadsPerDay", {
    count: info.dailyUploadLimit ?? 0
  });
  const chatLine =
    info.messagesPerChatLimit == null
      ? t(language, "plan.bullet.unlimitedMessages")
      : t(language, "plan.bullet.messagesPerChat", {
          count: info.messagesPerChatLimit
        });

  if (plan === "free") {
    return [createLine, uploadLine, t(language, "plan.bullet.standardText"), chatLine];
  }

  if (plan === "pro") {
    return [
      t(language, "plan.bullet.fasterImages"),
      createLine,
      uploadLine,
      t(language, "plan.bullet.fasterReplies"),
      chatLine
    ];
  }

  return [
    t(language, "plan.bullet.evenFasterImages"),
    createLine,
    uploadLine,
    t(language, "plan.bullet.evenFasterReplies"),
    chatLine
  ];
}

export function getProActionLabel(
  language: LanguageCode,
  current: PlanId,
  scheduledPlan?: PlanId | null,
  scheduledAt?: string | null,
  periodEnd?: string | null
) {
  if (current === "pro") return t(language, "plan.active");
  if (current !== "ultra") return t(language, "plan.buyPro");

  const endIso = scheduledAt ?? periodEnd;
  if (!endIso) return t(language, "plan.switchProAtEnd");

  const date = formatPlanDate(language, endIso);
  return scheduledPlan === "pro"
    ? t(language, "plan.switchProAtDate", { date })
    : t(language, "plan.switchProAtEndWithDate", { date });
}

export function getUltraActionLabel(language: LanguageCode, current: PlanId) {
  if (current === "ultra") return t(language, "plan.active");
  if (current === "pro") return t(language, "plan.upgradeProrated");
  return t(language, "plan.buyUltra");
}

export function getPlanUsageLabel(
  language: LanguageCode,
  createRemaining: number | null,
  createLimit: number | null,
  uploadRemaining: number | null,
  uploadLimit: number | null
) {
  if (createLimit == null || uploadLimit == null) return "…";
  return t(language, "plan.usageCreateSend", {
    createRemaining: createRemaining ?? 0,
    createLimit,
    uploadRemaining: uploadRemaining ?? 0,
    uploadLimit
  });
}
