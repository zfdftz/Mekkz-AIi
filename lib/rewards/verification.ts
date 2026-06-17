import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MEKKZ_CREATOR_EMAIL,
  ULTRA_CREATOR_FOLLOWER_THRESHOLD,
  VERIFIED_FOLLOWER_THRESHOLD
} from "./constants";
import { grantBadge, revokeBadge } from "./badges";
import { getFollowerCounts } from "@/lib/community/public-profile";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export async function applyCreatorStatus(
  admin: SupabaseClient,
  userId: string,
  email: string | null | undefined
) {
  const isCreator = email?.trim().toLowerCase() === MEKKZ_CREATOR_EMAIL;
  if (isCreator) {
    await admin
      .from("user_profiles")
      .update({
        is_creator: true,
        is_verified: true,
        active_title: "mekkz_ai_creator"
      })
      .eq("user_id", userId);
    await grantBadge(admin, userId, "mekkz_creator", "system");
  }
  return isCreator;
}

export async function syncVerification(
  admin: SupabaseClient,
  userId: string,
  followersCount?: number
) {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("is_creator, is_verified")
    .eq("user_id", userId)
    .maybeSingle();

  const count =
    followersCount ??
    (await getFollowerCounts(admin, userId)).followersCount;

  if (profile?.is_creator) {
    await admin.from("user_profiles").update({ is_verified: true }).eq("user_id", userId);
    await grantBadge(admin, userId, "verified_user", "system");
    await grantBadge(admin, userId, "mekkz_creator", "system");
    const isUltra = count >= ULTRA_CREATOR_FOLLOWER_THRESHOLD;
    await admin
      .from("user_profiles")
      .update({ is_ultra_creator: isUltra })
      .eq("user_id", userId);
    if (isUltra) await grantBadge(admin, userId, "ultra_creator", "system");
    return { isVerified: true, isCreator: true, isUltraCreator: isUltra };
  }

  const shouldVerify = count >= VERIFIED_FOLLOWER_THRESHOLD;
  const shouldUltra = count >= ULTRA_CREATOR_FOLLOWER_THRESHOLD;
  await admin
    .from("user_profiles")
    .update({
      is_verified: shouldVerify,
      is_ultra_creator: shouldUltra
    })
    .eq("user_id", userId);

  if (shouldVerify) {
    await grantBadge(admin, userId, "verified_user", "system");
  } else {
    try {
      await revokeBadge(admin, userId, "verified_user");
    } catch {
      /* protected revoke skipped */
    }
  }

  if (shouldUltra) {
    await grantBadge(admin, userId, "ultra_creator", "system");
  } else {
    try {
      await revokeBadge(admin, userId, "ultra_creator");
    } catch {
      /* protected revoke skipped */
    }
  }

  return { isVerified: shouldVerify, isCreator: false, isUltraCreator: shouldUltra };
}

export async function getVerificationFlags(admin: SupabaseClient, userId: string) {
  const [{ data, error }, { data: founderRow }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("is_verified, is_creator, is_chosen, is_ultra_creator")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId)
      .eq("badge_id", "founder")
      .maybeSingle()
  ]);
  if (error && !missing(error.message)) throw new Error(error.message);
  return {
    isVerified: Boolean(data?.is_verified),
    isCreator: Boolean(data?.is_creator),
    isChosen: Boolean(data?.is_chosen),
    isUltraCreator: Boolean(data?.is_ultra_creator),
    isFounder: Boolean(founderRow)
  };
}

export async function setChosenStatus(
  admin: SupabaseClient,
  userId: string,
  chosen: boolean
) {
  const { error } = await admin
    .from("user_profiles")
    .update({ is_chosen: chosen })
    .eq("user_id", userId);
  if (error && !missing(error.message)) throw new Error(error.message);
}

export async function adminSetIdentityFlags(
  admin: SupabaseClient,
  userId: string,
  flags: Partial<{
    isVerified: boolean;
    isCreator: boolean;
    isUltraCreator: boolean;
    isChosen: boolean;
  }>
) {
  const payload: Record<string, boolean> = {};
  if (flags.isVerified !== undefined) payload.is_verified = flags.isVerified;
  if (flags.isCreator !== undefined) payload.is_creator = flags.isCreator;
  if (flags.isUltraCreator !== undefined) payload.is_ultra_creator = flags.isUltraCreator;
  if (flags.isChosen !== undefined) payload.is_chosen = flags.isChosen;

  if (Object.keys(payload).length > 0) {
    const { error } = await admin.from("user_profiles").update(payload).eq("user_id", userId);
    if (error && !missing(error.message)) throw new Error(error.message);
  }

  if (flags.isVerified === true) await grantBadge(admin, userId, "verified_user", "admin");
  if (flags.isVerified === false) {
    try {
      await revokeBadge(admin, userId, "verified_user");
    } catch {
      /* protected */
    }
  }
  if (flags.isCreator === true) {
    await grantBadge(admin, userId, "mekkz_creator", "admin");
    await grantBadge(admin, userId, "founder", "admin");
  }
  if (flags.isCreator === false) {
    try {
      await revokeBadge(admin, userId, "mekkz_creator");
    } catch {
      /* protected */
    }
  }
  if (flags.isUltraCreator === true) await grantBadge(admin, userId, "ultra_creator", "admin");
  if (flags.isUltraCreator === false) {
    try {
      await revokeBadge(admin, userId, "ultra_creator");
    } catch {
      /* protected */
    }
  }
}
