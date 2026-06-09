import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const REGISTRATION_TTL_MS = 30 * 60 * 1000;

function pepper() {
  return process.env.VERIFICATION_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || "mekkz-verification";
}

function encryptionKey() {
  return scryptSync(pepper(), "mekkz-pending-password", 32);
}

export function encryptPassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPassword(payload: string) {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Registrierungsdaten sind ungültig.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

export async function upsertPendingRegistration(
  admin: SupabaseClient,
  email: string,
  password: string
) {
  const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS).toISOString();
  const { error } = await admin.from("pending_registrations").upsert(
    {
      email: email.toLowerCase(),
      password_hash: encryptPassword(password),
      code_hash: "supabase-otp",
      expires_at: expiresAt,
      attempts: 0,
      created_at: new Date().toISOString()
    },
    { onConflict: "email" }
  );

  if (error) {
    if (/relation|does not exist|Could not find/i.test(error.message)) {
      throw new Error(
        "Registrierungstabelle fehlt. Bitte migration-email-verification.sql in Supabase ausführen."
      );
    }
    throw new Error(error.message);
  }

  return expiresAt;
}

export async function getPendingRegistration(
  admin: SupabaseClient,
  email: string
) {
  const normalized = email.toLowerCase().trim();
  const { data, error } = await admin
    .from("pending_registrations")
    .select("email, password_hash, expires_at")
    .eq("email", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Kein offener Registrierungsversuch gefunden. Bitte erneut registrieren.");
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    await admin.from("pending_registrations").delete().eq("email", normalized);
    throw new Error("Die Registrierung ist abgelaufen (30 Minuten). Bitte erneut registrieren.");
  }

  return {
    email: normalized,
    password: decryptPassword(data.password_hash as string)
  };
}

export async function consumePendingRegistration(
  admin: SupabaseClient,
  email: string
) {
  const pending = await getPendingRegistration(admin, email);
  await deletePendingRegistration(admin, pending.email);
  return pending;
}

export async function deletePendingRegistration(admin: SupabaseClient, email: string) {
  await admin.from("pending_registrations").delete().eq("email", email.toLowerCase());
}

export function registrationExpiryMinutes() {
  return REGISTRATION_TTL_MS / 60_000;
}
