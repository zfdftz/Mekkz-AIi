import type { User } from "@supabase/supabase-js";

export function isGuestUser(user: User | null | undefined) {
  if (!user) return false;
  return Boolean(user.is_anonymous) || !user.email;
}

export function isRegisteredUser(user: User | null | undefined) {
  return Boolean(user && !isGuestUser(user));
}
