import { SupabaseClient } from "@supabase/supabase-js";
import { countConversationMessages } from "./chat-storage";
import { getPlanInfo, PlanId, PLANS } from "./plans";
import { isActiveSubscriptionStatus } from "./stripe";

type UserPlanRow = {
  user_id: string;
  plan: string;
  images_today: number;
  uploads_today?: number;
  usage_day: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
};

export type UserStripeBilling = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  hasActiveSubscription: boolean;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
};

export type ConversationLimitState = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

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
        ? `Upgrade auf Pro (${PLANS.pro.messagesPerChatLimit} pro Chat) oder Ultra (unbegrenzt).`
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
  stripeSubscriptionStatus: string | null = null
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
    hasActiveSubscription: isActiveSubscriptionStatus(stripeSubscriptionStatus)
  };
}

export async function getUserPlanRow(
  admin: SupabaseClient,
  userId: string
): Promise<UserPlanRow | null> {
  const { data, error } = await admin
    .from("user_plans")
    .select(
      "user_id, plan, images_today, uploads_today, usage_day, stripe_customer_id, stripe_subscription_id, stripe_subscription_status"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message) || isMissingColumnError(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  return (data as UserPlanRow | null) ?? null;
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

  const row = await getUserPlanRow(admin, userId);

  if (!row) {
    await admin.from("user_plans").insert({
      user_id: userId,
      plan: "free",
      images_today: 0,
      uploads_today: 0,
      usage_day: today
    });
    return buildState("free", 0, 0);
  }

  const plan = (row.plan === "pro" || row.plan === "ultra" ? row.plan : "free") as PlanId;
  const uploadsToday = row.uploads_today ?? 0;
  const stripeStatus = row.stripe_subscription_status ?? null;

  if (row.usage_day !== today) {
    await admin
      .from("user_plans")
      .update({
        images_today: 0,
        uploads_today: 0,
        usage_day: today,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);
    return buildState(plan, 0, 0, stripeStatus);
  }

  return buildState(plan, row.images_today ?? 0, uploadsToday, stripeStatus);
}

export async function assertCanGenerateImage(admin: SupabaseClient, userId: string) {
  const state = await getUserPlanState(admin, userId);

  if (state.dailyLimit !== null && state.imagesToday >= state.dailyLimit) {
    const upgradeHint =
      state.plan === "free"
        ? `Upgrade auf Pro (${PLANS.pro.dailyImageLimit}/Tag) oder Ultra (unbegrenzt).`
        : "Upgrade auf Ultra für unbegrenzte Bild-Erstellung.";
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
        ? `Upgrade auf Pro (${PLANS.pro.dailyUploadLimit}/Tag) oder Ultra (unbegrenzt).`
        : "Upgrade auf Ultra für unbegrenzte Bild-Uploads.";
    throw new Error(
      `Tageslimit für Bild-Uploads erreicht (${state.dailyUploadLimit} Bilder). ${upgradeHint}`
    );
  }

  return state;
}

export async function incrementImageUsage(admin: SupabaseClient, userId: string) {
  const state = await getUserPlanState(admin, userId);
  const today = todayKey();

  await admin.from("user_plans").upsert({
    user_id: userId,
    plan: state.plan,
    images_today: state.imagesToday + 1,
    uploads_today: state.uploadsToday,
    usage_day: today,
    updated_at: new Date().toISOString()
  });
}

export async function incrementUploadUsage(admin: SupabaseClient, userId: string) {
  const state = await getUserPlanState(admin, userId);
  const today = todayKey();

  await admin.from("user_plans").upsert({
    user_id: userId,
    plan: state.plan,
    images_today: state.imagesToday,
    uploads_today: state.uploadsToday + 1,
    usage_day: today,
    updated_at: new Date().toISOString()
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
  }
) {
  const today = todayKey();
  const current = await getUserPlanState(admin, userId);

  await admin.from("user_plans").upsert({
    user_id: userId,
    plan,
    images_today: current.imagesToday,
    uploads_today: current.uploadsToday,
    usage_day: today,
    stripe_customer_id: stripe.customerId,
    stripe_subscription_id: stripe.subscriptionId,
    stripe_subscription_status: stripe.subscriptionStatus,
    updated_at: new Date().toISOString()
  });

  return getUserPlanState(admin, userId);
}

export async function downgradeUserToFree(admin: SupabaseClient, userId: string) {
  const today = todayKey();
  const current = await getUserPlanState(admin, userId);

  await admin.from("user_plans").upsert({
    user_id: userId,
    plan: "free",
    images_today: current.imagesToday,
    uploads_today: current.uploadsToday,
    usage_day: today,
    stripe_subscription_status: "canceled",
    updated_at: new Date().toISOString()
  });

  return getUserPlanState(admin, userId);
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
