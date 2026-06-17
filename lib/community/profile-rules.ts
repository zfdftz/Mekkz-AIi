export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 21;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const USERNAME_CHANGE_COOLDOWN_MS = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const USERNAME_PATTERN = /^[\w.-]+$/;

export function normalizeUsername(raw: string) {
  return raw.trim().slice(0, USERNAME_MAX_LENGTH).toLowerCase();
}

export function validateUsername(username: string) {
  if (username.length < USERNAME_MIN_LENGTH) {
    throw new Error(`Benutzername: mindestens ${USERNAME_MIN_LENGTH} Zeichen.`);
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    throw new Error(`Benutzername: maximal ${USERNAME_MAX_LENGTH} Zeichen.`);
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Benutzername: nur Buchstaben, Zahlen, _, . und - erlaubt.");
  }
}

export function avatarPayloadSize(avatarUrl: string) {
  if (!avatarUrl.startsWith("data:")) return 0;
  const base64 = avatarUrl.split(",")[1];
  if (!base64) return 0;
  return Math.ceil((base64.length * 3) / 4);
}

export function validateAvatarUrl(avatarUrl: string) {
  const isDataUrl = avatarUrl.startsWith("data:image/");
  const isHttpUrl = /^https?:\/\//i.test(avatarUrl);
  if (!isDataUrl && !isHttpUrl) {
    throw new Error("Avatar: gültige Bild-URL oder Upload verwenden.");
  }
  if (isDataUrl) {
    const size = avatarPayloadSize(avatarUrl);
    if (size > AVATAR_MAX_BYTES) {
      throw new Error(`Avatar: maximal ${Math.round(AVATAR_MAX_BYTES / (1024 * 1024))} MB.`);
    }
  }
}

export function validateBirthday(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Ungültiges Geburtsdatum.");
  }
  const age = (Date.now() - date.getTime()) / (365.25 * 86400000);
  if (age < 7) throw new Error("Du musst mindestens 7 Jahre alt sein.");
  if (age > 105) throw new Error("Geburtsdatum ungültig (max. 105 Jahre).");
  return date.toISOString().slice(0, 10);
}

export function usernameChangeEligibility(usernameChangedAt: string | null | undefined) {
  if (!usernameChangedAt) {
    return { canChange: true, nextChangeAt: null as string | null };
  }
  const last = new Date(usernameChangedAt).getTime();
  const next = last + USERNAME_CHANGE_COOLDOWN_MS;
  if (Date.now() >= next) {
    return { canChange: true, nextChangeAt: null as string | null };
  }
  return { canChange: false, nextChangeAt: new Date(next).toISOString() };
}
