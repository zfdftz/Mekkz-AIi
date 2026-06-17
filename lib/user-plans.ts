import { SupabaseClient } from "@supabase/supabase-js";
import { countConversationMessages } from "./chat-storage";
import { getPlanInfo, PlanId, PLANS, buildPlansLimitsReference, isPaidPlanId } from "./plans";
import { formatBillingDateIso } from "./stripe-billing";
import { isActiveSubscriptionStatus, isEntitledSubscriptionStatus } from "./stripe";

type UserPlanRow = {
  user_id: string;
  plan: string;
  images_today: number;
  uploads_today?: number;
  usage_day: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_period_end?: string | null;
  scheduled_plan?: string | null;
  scheduled_plan_at?: string | null;
};

export type UserStripeBilling = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  hasActiveSubscription: boolean;
};

function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

function normalizeUsageDay(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
  }
  return String(value).slice(0, 10);
}

function isSameUsageDay(value: string | Date | null | undefined, day = todayKey()) {
  return normalizeUsageDay(value) === day;
}

function usageDayStatus(value: string | Date | null | undefined, today = todayKey()) {
  const normalized = normalizeUsageDay(value);
  if (!normalized) return "missing" as const;
  if (normalized === today) return "same" as const;
  if (normalized < today) return "past" as const;
  return "future" as const;
}

function normalizeScheduledPlan(value: string | null | undefined): PlanId | null {
  if (value === "pro" || value === "ultra") return value;
  return null;
}

/** Nur bezahlte Pläne mit gültigem Stripe-Status — sonst Free. */
export function resolveEntitledPlan(row: UserPlanRow | null | undefined): PlanId {
  if (!row) return "free";

  const stored = isPaidPlanId(row.plan) ? row.plan : "free";
  if (stored === "free") return "free";

  if (process.env.ALLOW_DEMO_PLAN_UPGRADE === "true") {
    return stored;
  }

  return isEntitledSubscriptionStatus(row.stripe_subscription_status) ? stored : "free";
}

export function hasStoredPaidPlan(row: UserPlanRow | null | undefined) {
  return isPaidPlanId(row?.plan);
}

function billingFromPlanRow(row: UserPlanRow) {
  return {
    stripePeriodEnd: row.stripe_period_end ?? null,
    scheduledPlan: normalizeScheduledPlan(row.scheduled_plan),
    scheduledPlanAt: row.scheduled_plan_at ?? null
  };
}

function canManageStripeBilling(row: UserPlanRow | null | undefined) {
  if (!row) return false;
  return Boolean(
    row.stripe_customer_id ||
      row.stripe_subscription_id ||
      isEntitledSubscriptionStatus(row.stripe_subscription_status)
  );
}

function stateFromPlanRow(row: UserPlanRow): UserPlanState {
  const plan = resolveEntitledPlan(row);
  return buildState(
    plan,
    row.images_today ?? 0,
    row.uploads_today ?? 0,
    row.stripe_subscription_status ?? null,
    plan === "free"
      ? {
          stripePeriodEnd: null,
          scheduledPlan: null,
          scheduledPlanAt: null
        }
      : billingFromPlanRow(row),
    canManageStripeBilling(row)
  );
}

function isMissingTableError(message: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(message);
}

function isMissingColumnError(message: string) {
  return /uploads_today|stripe_|column|Could not find/i.test(message);
}

export type UserPlanState = {
  plan: PlanId;
  imagesToday: number;
  dailyLimit: number | null;
  remaining: number | null;
  uploadsToday: number;
  dailyUploadLimit: number | null;
  uploadsRemaining: number | null;
  imageReadyDelayMs: number;
  textReadyDelayMs: number;
  messagesPerChatLimit: number | null;
  planLabel: string;
  stripeSubscriptionStatus: string | null;
  hasActiveSubscription: boolean;
  canManageBilling: boolean;
  stripePeriodEnd: string | null;
  scheduledPlan: PlanId | null;
  scheduledPlanAt: string | null;
};

export type ConversationLimitState = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

export function buildPlanSystemPrompt(
  planState: UserPlanState,
  chatLimit: ConversationLimitState
) {
  const chatLimitLine =
    chatLimit.limit === null
      ? "- Nachrichten in diesem Chat: unbegrenzt (Ultra)."
      : `- Nachrichten in diesem Chat: max. ${chatLimit.limit} (aktuell ${chatLimit.used} genutzt, noch ${chatLimit.remaining ?? 0} frei). Bei vollem Chat: neuen Chat starten.`;

  const createLimit = planState.dailyLimit ?? PLANS[planState.plan].dailyImageLimit;
  const uploadLimit =
    planState.dailyUploadLimit ?? PLANS[planState.plan].dailyUploadLimit;

  const imageCreateLine =
    `- Bilder ERSTELLEN (generieren) pro Tag: max. ${createLimit} (heute ${planState.imagesToday}, noch ${planState.remaining ?? 0}).`;

  const imageUploadLine =
    `- Bilder SENDEN (hochladen/an mekkz AI schicken) pro Tag: max. ${uploadLimit} (heute ${planState.uploadsToday}, noch ${planState.uploadsRemaining ?? 0}).`;

  const billingEndIso = planState.scheduledPlanAt ?? planState.stripePeriodEnd;
  const billingLine = billingEndIso
    ? planState.scheduledPlan === "pro"
      ? `- Geplanter Wechsel: Am Abo-Ende (${formatBillingDateIso(billingEndIso)}) wechselt der Plan auf Pro; bis dahin bleibt Ultra aktiv. NIEMALS „Monatsende“ oder „Kalendermonatsende“ sagen — nur „Abo-Ende“ oder das Datum ${formatBillingDateIso(billingEndIso)}. Abrechnung = 30 Tage ab Kaufdatum.\n`
      : `- Nächstes Abo-Ende: ${formatBillingDateIso(billingEndIso)} (30-Tage-Zyklus ab Kaufdatum, nicht Kalendermonatsende).\n`
    : "";

  return (
    "INTERNAL PLAN DATA (for limits only — explain to the user in THEIR message language, never in German by default):\n" +
    buildPlansLimitsReference() +
    "\n" +
    `Aktueller Plan des Nutzers: ${planState.planLabel} (${planState.plan}).\n` +
    chatLimitLine +
    imageCreateLine +
    imageUploadLine +
    billingLine +
    "LIMIT-FRAGEN (WICHTIG):\n" +
    "- „Bilder erstellen“ = generierte Bilder (z. B. „mach ein Bild von …“). „Bilder senden“ = Fotos im Chat hochladen.\n" +
    `- Auf Free: ${createLimit} erstellen, ${uploadLimit} senden/hochladen — niemals 10 oder andere erfundene Zahlen.\n` +
    "- Antworte immer mit den exakten Zahlen des AKTUELLEN Plans oben, nicht mit Pro/Ultra-Limits.\n" +
    "GESCHWINDIGKEIT / WARTEZEIT (WICHTIG — dem Nutzer NIEMALS technische Delays oder Sekunden nennen):\n" +
    "- Intern: Free etwas ruhiger, Pro flotter, Ultra am schnellsten. Das dem Nutzer NICHT als 'Delay' oder Wartezeit erklären.\n" +
    "- Fragt der Nutzer warum es dauert oder ob es Verzögerungen gibt: sage freundlich, das sei normal (Denken, Verarbeiten) — ohne Zahlen, ohne 'Tarif-Delay'.\n" +
    (planState.plan === "free"
      ? "- Auf Free: beruhigend, dass das normal ist. Optional dezent: mit Plus, Pro oder Ultra antwortest du schneller und lebendiger.\n"
      : planState.plan === "plus"
        ? "- Auf Plus: bestätige dass es flotter als Free läuft; Pro/Ultra wären noch direkter.\n"
      : planState.plan === "pro"
        ? "- Auf Pro: bestätige dass es flotter läuft; Ultra wäre noch direkter und mit noch mehr Energie.\n"
        : "- Auf Ultra: bestätige dass du mit voller Energie und ohne Einschränkung antwortest.\n") +
    "Wenn der Nutzer fragt, ob er MEHR als 40 Nachrichten im gleichen Chat senden kann:\n" +
    (planState.plan === "free"
      ? "- Auf Free: NEIN, maximal 40 Nachrichten pro Chat (wie ChatGPT). Danach neuer Chat oder Upgrade auf Plus (50) / Pro (80) / Ultra (unbegrenzt).\n"
      : planState.plan === "plus"
        ? "- Auf Plus: maximal 50 Nachrichten pro Chat. Pro = 80, Ultra = unbegrenzt.\n"
      : planState.plan === "pro"
        ? "- Auf Pro: maximal 80 Nachrichten pro Chat, nicht unbegrenzt. Ultra = unbegrenzt.\n"
        : "- Auf Ultra: ja, unbegrenzte Nachrichten pro Chat.\n") +
    "Nenne immer die echten Limits des aktuellen Plans. Erfinde keine höheren Limits. Upgrade-Hinweis nur sachlich, nicht aufdringlich.\n"
  );
}

function buildConversationLimitState(
  used: number,
  limit: number | null
): ConversationLimitState {
  const remaining = limit === null ? null : Math.max(0, limit - used);
  return { used, limit, remaining };
}

export async function getConversationLimitState(
  admin: SupabaseClient,
  userId: string,
  conversationId: string,
  plan?: PlanId
): Promise<ConversationLimitState> {
  const planId = plan ?? (await getUserPlanState(admin, userId)).plan;
  const limit = getPlanInfo(planId).messagesPerChatLimit;
  const used = await countConversationMessages(admin, userId, conversationId);
  return buildConversationLimitState(used, limit);
}

export async function assertCanSendChatMessage(
  admin: SupabaseClient,
  userId: string,
  conversationId: string
) {
  const planState = await getUserPlanState(admin, userId);
  const limitState = await getConversationLimitState(
    admin,
    userId,
    conversationId,
    planState.plan
  );

  if (limitState.limit !== null && limitState.used >= limitState.limit) {
    const upgradeHint =
      planState.plan === "free"
        ? `Upgrade auf Plus (${PLANS.plus.messagesPerChatLimit} pro Chat), Pro (${PLANS.pro.messagesPerChatLimit} pro Chat) oder Ultra (unbegrenzt).`
        : planState.plan === "plus"
          ? "Upgrade auf Pro (80 pro Chat) oder Ultra (unbegrenzt)."
        : planState.plan === "pro"
          ? "Upgrade auf Ultra für unbegrenzte Nachrichten pro Chat."
          : "";
    throw new Error(
      `Dieser Chat ist voll (${limitState.limit} Nachrichten, wie bei ChatGPT). ` +
        `Bitte starte einen neuen Chat.${upgradeHint ? ` ${upgradeHint}` : ""}`
    );
  }

  return limitState;
}

function buildState(
  plan: PlanId,
  imagesToday: number,
  uploadsToday: number,
  stripeSubscriptionStatus: string | null = null,
  billing: {
    stripePeriodEnd?: string | null;
    scheduledPlan?: PlanId | null;
    scheduledPlanAt?: string | null;
  } = {},
  canManageBilling = false
): UserPlanState {
  const info = getPlanInfo(plan);
  const dailyLimit = info.dailyImageLimit;
  const dailyUploadLimit = info.dailyUploadLimit;
  const remaining =
    dailyLimit === null ? null : Math.max(0, dailyLimit - imagesToday);
  const uploadsRemaining =
    dailyUploadLimit === null
      ? null
      : Math.max(0, dailyUploadLimit - uploadsToday);

  return {
    plan,
    imagesToday,
    dailyLimit,
    remaining,
    uploadsToday,
    dailyUploadLimit,
    uploadsRemaining,
    imageReadyDelayMs: info.imageReadyDelayMs,
    textReadyDelayMs: info.textReadyDelayMs,
    messagesPerChatLimit: info.messagesPerChatLimit,
    planLabel: info.label,
    stripeSubscriptionStatus,
    hasActiveSubscription: isActiveSubscriptionStatus(stripeSubscriptionStatus),
    canManageBilling,
    stripePeriodEnd: billing.stripePeriodEnd ?? null,
    scheduledPlan: billing.scheduledPlan ?? null,
    scheduledPlanAt: billing.scheduledPlanAt ?? null
  };
}

const PLAN_USAGE_SELECT =
  "user_id, plan, images_today, uploads_today, usage_day";

export async function tryGetUserPlanState(
  admin: SupabaseClient,
  userId: string
): Promise<UserPlanState | null> {
  try {
    return await getUserPlanState(admin, userId);
  } catch {
    return null;
  }
}

export async function getUserPlanRow(
  admin: SupabaseClient,
  userId: string
): Promise<UserPlanRow | null> {
  const fullSelect =
    "user_id, plan, images_today, uploads_today, usage_day, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_period_end, scheduled_plan, scheduled_plan_at";

  const { data, error } = await admin
    .from("user_plans")
    .select(fullSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) {
    return (data as UserPlanRow | null) ?? null;
  }

  if (isMissingTableError(error.message)) {
    return null;
  }

  if (isMissingColumnError(error.message)) {
    const { data: fallback, error: fallbackError } = await admin
      .from("user_plans")
      .select("user_id, plan, images_today, uploads_today, usage_day")
      .eq("user_id", userId)
      .maybeSingle();

    if (fallbackError) {
      if (isMissingTableError(fallbackError.message)) return null;
      throw new Error(fallbackError.message);
    }

    return (fallback as UserPlanRow | null) ?? null;
  }

  throw new Error(error.message);
}

export async function getUserStripeBilling(
  admin: SupabaseClient,
  userId: string
): Promise<UserStripeBilling> {
  const row = await getUserPlanRow(admin, userId);
  const status = row?.stripe_subscription_status ?? null;

  return {
    stripeCustomerId: row?.stripe_customer_id ?? null,
    stripeSubscriptionId: row?.stripe_subscription_id ?? null,
    stripeSubscriptionStatus: status,
    hasActiveSubscription: isActiveSubscriptionStatus(status)
  };
}

export async function getUserPlanState(
  admin: SupabaseClient,
  userId: string
): Promise<UserPlanState> {
  const today = todayKey();

  let row = await getUserPlanRow(admin, userId);

  if (!row) {
    const { data, error } = await admin
      .from("user_plans")
      .insert({
        user_id: userId,
        plan: "free",
        images_today: 0,
        uploads_today: 0,
        usage_day: today
      })
      .select(PLAN_USAGE_SELECT)
      .maybeSingle();

    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        row = await getUserPlanRow(admin, userId);
      } else if (isMissingColumnError(error.message)) {
        const { data: fallback, error: insertError } = await admin
          .from("user_plans")
          .insert({
            user_id: userId,
            plan: "free",
            images_today: 0,
            uploads_today: 0,
            usage_day: today
          })
          .select("user_id, plan, images_today, usage_day")
          .maybeSingle();
        if (!insertError && fallback) {
          row = { ...fallback, uploads_today: 0 } as UserPlanRow;
        } else {
          row = await getUserPlanRow(admin, userId);
        }
      } else {
        throw new Error(error.message);
      }
    } else if (data) {
      row = data as UserPlanRow;
    }
  }

  if (!row) {
    row = await getUserPlanRow(admin, userId);
  }

  if (!row) {
    return buildState("free", 0, 0);
  }

  const plan = resolveEntitledPlan(row);
  const stripeStatus = row.stripe_subscription_status ?? null;
  const billing =
    plan === "free"
      ? {
          stripePeriodEnd: null,
          scheduledPlan: null,
          scheduledPlanAt: null
        }
      : billingFromPlanRow(row);
  const dayStatus = usageDayStatus(row.usage_day, today);

  if (dayStatus === "past") {
    const { data, error } = await admin
      .from("user_plans")
      .update({
        images_today: 0,
        uploads_today: 0,
        usage_day: today,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .select(PLAN_USAGE_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const refreshed = (data as UserPlanRow | null) ?? {
      ...row,
      images_today: 0,
      uploads_today: 0,
      usage_day: today
    };
    return stateFromPlanRow(refreshed);
  }

  if (dayStatus === "missing") {
    await admin
      .from("user_plans")
      .update({
        usage_day: today,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);
  }

  return buildState(
    plan,
    row.images_today ?? 0,
    row.uploads_today ?? 0,
    stripeStatus,
    billing,
    canManageStripeBilling(row)
  );
}

export async function consumeUploadSlot(admin: SupabaseClient, userId: string) {
  const state = await getUserPlanState(admin, userId);

  if (
    state.dailyUploadLimit !== null &&
    state.uploadsToday >= state.dailyUploadLimit
  ) {
    const upgradeHint =
      state.plan === "free"
        ? `Upgrade auf Plus (${PLANS.plus.dailyUploadLimit}/Tag), Pro (${PLANS.pro.dailyUploadLimit}/Tag) oder Ultra (${PLANS.ultra.dailyUploadLimit}/Tag).`
        : state.plan === "plus"
          ? `Upgrade auf Pro (${PLANS.pro.dailyUploadLimit}/Tag) oder Ultra (${PLANS.ultra.dailyUploadLimit}/Tag).`
        : "Tageslimit für Bild-Uploads erreicht. Morgen wieder verfügbar.";
    throw new Error(
      `Tageslimit für Bild-Uploads erreicht (${state.dailyUploadLimit} Bilder). ${upgradeHint}`
    );
  }

  return incrementUploadUsage(admin, userId);
}

export async function consumeImageCreateSlot(admin: SupabaseClient, userId: string) {
  const state = await getUserPlanState(admin, userId);

  if (state.dailyLimit !== null && state.imagesToday >= state.dailyLimit) {
    const upgradeHint =
      state.plan === "free"
        ? `Upgrade auf Plus (${PLANS.plus.dailyImageLimit}/Tag), Pro (${PLANS.pro.dailyImageLimit}/Tag) oder Ultra (${PLANS.ultra.dailyImageLimit}/Tag).`
        : "Tageslimit erreicht. Morgen sind wieder neue Bilder verfügbar.";
    throw new Error(
      `Tageslimit für Bild-Erstellung erreicht (${state.dailyLimit} Bilder). ${upgradeHint}`
    );
  }

  return incrementImageUsage(admin, userId);
}

export async function assertCanGenerateImage(admin: SupabaseClient, userId: string) {
  const state = await getUserPlanState(admin, userId);

  if (state.dailyLimit !== null && state.imagesToday >= state.dailyLimit) {
    const upgradeHint =
      state.plan === "free"
        ? `Upgrade auf Plus (${PLANS.plus.dailyImageLimit}/Tag), Pro (${PLANS.pro.dailyImageLimit}/Tag) oder Ultra (${PLANS.ultra.dailyImageLimit}/Tag).`
        : "Tageslimit erreicht. Morgen sind wieder neue Bilder verfügbar.";
    throw new Error(
      `Tageslimit für Bild-Erstellung erreicht (${state.dailyLimit} Bilder). ${upgradeHint}`
    );
  }

  return state;
}

export async function assertCanSendImage(admin: SupabaseClient, userId: string) {
  const state = await getUserPlanState(admin, userId);

  if (
    state.dailyUploadLimit !== null &&
    state.uploadsToday >= state.dailyUploadLimit
  ) {
    const upgradeHint =
      state.plan === "free"
        ? `Upgrade auf Plus (${PLANS.plus.dailyUploadLimit}/Tag), Pro (${PLANS.pro.dailyUploadLimit}/Tag) oder Ultra (${PLANS.ultra.dailyUploadLimit}/Tag).`
        : state.plan === "plus"
          ? `Upgrade auf Pro (${PLANS.pro.dailyUploadLimit}/Tag) oder Ultra (${PLANS.ultra.dailyUploadLimit}/Tag).`
        : "Tageslimit für Bild-Uploads erreicht. Morgen wieder verfügbar.";
    throw new Error(
      `Tageslimit für Bild-Uploads erreicht (${state.dailyUploadLimit} Bilder). ${upgradeHint}`
    );
  }

  return state;
}

async function bumpPlanUsage(
  admin: SupabaseClient,
  userId: string,
  field: "images" | "uploads",
  stripeSubscriptionStatus: string | null
): Promise<UserPlanState | null> {
  const { data, error } = await admin.rpc("bump_user_plan_usage", {
    p_user_id: userId,
    p_field: field
  });

  if (error) {
    if (/bump_user_plan_usage|could not find|schema cache/i.test(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as {
    plan?: string;
    images_today?: number;
    uploads_today?: number;
  };

  const plan = (isPaidPlanId(payload.plan ?? "") ? payload.plan : "free") as PlanId;
  return buildState(
    plan,
    Number(payload.images_today ?? 0),
    Number(payload.uploads_today ?? 0),
    stripeSubscriptionStatus
  );
}

async function persistPlanUsage(
  admin: SupabaseClient,
  userId: string,
  state: UserPlanState,
  next: { imagesToday: number; uploadsToday: number }
) {
  const today = todayKey();
  const existing = await getUserPlanRow(admin, userId);
  const plan = (isPaidPlanId(existing?.plan ?? "") ? existing!.plan : state.plan) as PlanId;
  const stripeStatus = existing?.stripe_subscription_status ?? state.stripeSubscriptionStatus;

  const { data, error } = await admin
    .from("user_plans")
    .upsert(
      {
        user_id: userId,
        plan,
        images_today: next.imagesToday,
        uploads_today: next.uploadsToday,
        usage_day: today,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select("plan, images_today, uploads_today, usage_day")
    .single();

  if (error) {
    throw new Error(error.message || "Plan-Nutzung konnte nicht gespeichert werden.");
  }

  if (!isSameUsageDay(data.usage_day, today)) {
    throw new Error("Plan-Nutzung konnte nicht gespeichert werden (Datum).");
  }

  const imagesToday = Number(data.images_today ?? 0);
  const uploadsToday = Number(data.uploads_today ?? 0);
  const savedPlan = (isPaidPlanId(data.plan ?? "") ? data.plan : "free") as PlanId;

  return buildState(
    savedPlan,
    imagesToday,
    uploadsToday,
    stripeStatus
  );
}

export async function incrementImageUsage(admin: SupabaseClient, userId: string) {
  const row = await getUserPlanRow(admin, userId);
  const stripeStatus = row?.stripe_subscription_status ?? null;
  const bumped = await bumpPlanUsage(admin, userId, "images", stripeStatus);
  if (bumped) return bumped;

  const state = row ? stateFromPlanRow(row) : buildState("free", 0, 0, stripeStatus);
  return persistPlanUsage(admin, userId, state, {
    imagesToday: state.imagesToday + 1,
    uploadsToday: state.uploadsToday
  });
}

export async function incrementUploadUsage(admin: SupabaseClient, userId: string) {
  const row = await getUserPlanRow(admin, userId);
  const stripeStatus = row?.stripe_subscription_status ?? null;
  const bumped = await bumpPlanUsage(admin, userId, "uploads", stripeStatus);
  if (bumped) return bumped;

  const state = row ? stateFromPlanRow(row) : buildState("free", 0, 0, stripeStatus);
  return persistPlanUsage(admin, userId, state, {
    imagesToday: state.imagesToday,
    uploadsToday: state.uploadsToday + 1
  });
}

export async function setUserPlan(admin: SupabaseClient, userId: string, plan: PlanId) {
  const today = todayKey();
  const current = await getUserPlanState(admin, userId);

  await admin.from("user_plans").upsert({
    user_id: userId,
    plan,
    images_today: current.imagesToday,
    uploads_today: current.uploadsToday,
    usage_day: today,
    updated_at: new Date().toISOString()
  });

  return getUserPlanState(admin, userId);
}

export async function setUserPlanFromStripe(
  admin: SupabaseClient,
  userId: string,
  plan: PlanId,
  stripe: {
    customerId: string;
    subscriptionId: string;
    subscriptionStatus: string;
    periodEnd?: number;
  }
) {
  const today = todayKey();
  const normalizedPlan = isPaidPlanId(plan) ? plan : "free";
  let row = await getUserPlanRow(admin, userId);

  if (!row) {
    const { error: insertError } = await admin.from("user_plans").insert({
      user_id: userId,
      plan: "free",
      images_today: 0,
      uploads_today: 0,
      usage_day: today
    });
    if (insertError && !/duplicate|unique/i.test(insertError.message)) {
      if (!isMissingColumnError(insertError.message)) {
        throw new Error(insertError.message);
      }
    }
    row = await getUserPlanRow(admin, userId);
  }

  const basePayload = {
    user_id: userId,
    plan: normalizedPlan,
    images_today: row?.images_today ?? 0,
    uploads_today: row?.uploads_today ?? 0,
    usage_day: row?.usage_day ?? today,
    updated_at: new Date().toISOString()
  };

  const scheduledPlan = normalizeScheduledPlan(row?.scheduled_plan);
  const clearSchedule =
    normalizedPlan === "free" ||
    (scheduledPlan != null && normalizedPlan === scheduledPlan);

  const fullPayload: Record<string, unknown> = {
    ...basePayload,
    stripe_customer_id: stripe.customerId,
    stripe_subscription_id: stripe.subscriptionId,
    stripe_subscription_status: stripe.subscriptionStatus
  };

  if (stripe.periodEnd != null) {
    fullPayload.stripe_period_end = new Date(stripe.periodEnd * 1000).toISOString();
  }

  if (clearSchedule) {
    fullPayload.scheduled_plan = null;
    fullPayload.scheduled_plan_at = null;
  }

  const stripePayload: Record<string, unknown> = {
    ...basePayload,
    stripe_customer_id: stripe.customerId,
    stripe_subscription_id: stripe.subscriptionId,
    stripe_subscription_status: stripe.subscriptionStatus
  };

  const minimalPayloads: Record<string, unknown>[] = [
    fullPayload,
    stripePayload,
    basePayload,
    {
      user_id: userId,
      plan: normalizedPlan,
      images_today: row?.images_today ?? 0,
      usage_day: row?.usage_day ?? today,
      updated_at: new Date().toISOString()
    }
  ];

  let saved = false;
  let lastError: string | null = null;

  for (const payload of minimalPayloads) {
    const { error } = await admin.from("user_plans").upsert(payload);
    if (!error) {
      saved = true;
      lastError = null;
      break;
    }
    if (!isMissingColumnError(error.message)) {
      throw new Error(error.message);
    }
    lastError = error.message;
  }

  const { error: forcePlanError } = await admin
    .from("user_plans")
    .update({
      plan: normalizedPlan,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (forcePlanError && !isMissingColumnError(forcePlanError.message)) {
    throw new Error(forcePlanError.message);
  }

  const { data: verify, error: verifyError } = await admin
    .from("user_plans")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (verifyError && !isMissingColumnError(verifyError.message)) {
    throw new Error(verifyError.message);
  }

  const savedPlan = isPaidPlanId(verify?.plan ?? "") ? verify!.plan : "free";

  if (savedPlan !== normalizedPlan) {
    throw new Error(
      lastError ??
        "Plan konnte nicht in user_plans gespeichert werden. Bitte migration-stripe-complete.sql in Supabase ausführen."
    );
  }

  if (!saved && normalizedPlan !== "free") {
    // Plan was forced via update — still OK if verify passed.
  }

  return getUserPlanState(admin, userId);
}

export async function downgradeUserToFree(admin: SupabaseClient, userId: string) {
  const today = todayKey();
  const current = await getUserPlanState(admin, userId);

  const fullPayload = {
    user_id: userId,
    plan: "free" as const,
    images_today: current.imagesToday,
    uploads_today: current.uploadsToday,
    usage_day: today,
    stripe_subscription_id: null,
    stripe_subscription_status: "canceled",
    stripe_period_end: null,
    scheduled_plan: null,
    scheduled_plan_at: null,
    updated_at: new Date().toISOString()
  };

  const { error } = await admin.from("user_plans").upsert(fullPayload);

  if (error && isMissingColumnError(error.message)) {
    const { error: fallbackError } = await admin.from("user_plans").upsert({
      user_id: userId,
      plan: "free",
      images_today: current.imagesToday,
      uploads_today: current.uploadsToday,
      usage_day: today,
      stripe_subscription_status: "canceled",
      updated_at: new Date().toISOString()
    });
    if (fallbackError) throw new Error(fallbackError.message);
  } else if (error) {
    throw new Error(error.message);
  }

  return getUserPlanState(admin, userId);
}

export async function schedulePlanChangeAtPeriodEnd(
  admin: SupabaseClient,
  userId: string,
  plan: Exclude<PlanId, "free">,
  periodEndUnix: number
) {
  const at = new Date(periodEndUnix * 1000).toISOString();

  const { error } = await admin
    .from("user_plans")
    .update({
      scheduled_plan: plan,
      scheduled_plan_at: at,
      stripe_period_end: at,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (error) {
    if (isMissingColumnError(error.message)) return;
    throw new Error(error.message);
  }
}

export async function updateStripeCustomerId(
  admin: SupabaseClient,
  userId: string,
  customerId: string
) {
  const today = todayKey();
  const current = await getUserPlanState(admin, userId);

  await admin.from("user_plans").upsert({
    user_id: userId,
    plan: current.plan,
    images_today: current.imagesToday,
    uploads_today: current.uploadsToday,
    usage_day: today,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString()
  });
}
