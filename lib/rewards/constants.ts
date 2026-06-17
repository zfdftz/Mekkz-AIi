export const MEKKZ_CREATOR_EMAIL = "arda.alagoez@icloud.com";

/** Only this username gets the in-app rewards admin UI. */
export const MEKKZ_REWARDS_ADMIN_USERNAME = "mek";

/** Registrations on or before this date (UTC end of day) get OG Member badge/title. */
export const OG_MEMBER_CUTOFF = new Date("2026-07-31T23:59:59.999Z");

export const VERIFIED_FOLLOWER_THRESHOLD = 25_000;
export const ULTRA_CREATOR_FOLLOWER_THRESHOLD = 100_000;
export const SOCIAL_STAR_THRESHOLD = 1_000;

export const CRATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Season 1 (Cosmic Genesis) lasts 2 months; later seasons rotate every 30 days. */
export const SEASON_1_DURATION_DAYS = 60;
export const SEASON_ROTATION_DAYS = 30;

/** Epoch for season rotation (Season 1 starts here). */
export const SEASON_EPOCH = new Date("2026-06-17T00:00:00.000Z");

export const MAX_SHOWCASED_BADGES = 5;

export function getAdminEmails(): string[] {
  const raw = process.env.MEKKZ_ADMIN_EMAILS ?? MEKKZ_CREATOR_EMAIL;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAdminEmails().includes(normalized);
}

export function isOgEligible(registrationDate: Date) {
  return registrationDate.getTime() <= OG_MEMBER_CUTOFF.getTime();
}
