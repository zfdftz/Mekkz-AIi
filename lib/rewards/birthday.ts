import type { SupabaseClient } from "@supabase/supabase-js";
import { grantBadge } from "./badges";
import { addLimitedToInventory } from "./limited-items";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export function validateBirthdayDate(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Ungültiges Geburtsdatum.");
  }
  const ageMs = Date.now() - date.getTime();
  const age = ageMs / (365.25 * 86400000);
  if (age < 7) throw new Error("Du musst mindestens 7 Jahre alt sein.");
  if (age > 105) throw new Error("Bitte ein gültiges Geburtsdatum eingeben (max. 105 Jahre).");
  return date.toISOString().slice(0, 10);
}

export async function setBirthday(
  admin: SupabaseClient,
  userId: string,
  birthday: string,
  force = false
) {
  const iso = validateBirthdayDate(birthday);
  const { data } = await admin
    .from("user_profiles")
    .select("birthday, birthday_changed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.birthday && !force) {
    const changed = data.birthday_changed_at
      ? new Date(data.birthday_changed_at as string).getTime()
      : 0;
    const yearMs = 365 * 86400000;
    if (Date.now() - changed < yearMs) {
      throw new Error("Geburtstag kann nur einmal pro Jahr geändert werden.");
    }
  }

  await admin
    .from("user_profiles")
    .update({
      birthday: iso,
      birthday_changed_at: new Date().toISOString()
    })
    .eq("user_id", userId);
  return iso;
}

export async function processBirthdayRewards(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from("user_profiles")
    .select("birthday, birthday_reward_year")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.birthday) return false;

  const today = new Date();
  const bday = new Date(data.birthday as string);
  if (bday.getUTCMonth() !== today.getUTCMonth() || bday.getUTCDate() !== today.getUTCDate()) {
    return false;
  }

  const year = today.getFullYear();
  if ((data.birthday_reward_year as number) === year) return false;

  await grantBadge(admin, userId, "birthday_badge", "system");
  try {
    await addLimitedToInventory(admin, userId, "lim-banner-s1");
  } catch {
    // optional if already owned
  }

  await admin
    .from("user_profiles")
    .update({ birthday_reward_year: year })
    .eq("user_id", userId);
  return true;
}
