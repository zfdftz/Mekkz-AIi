-- Registrierung mit 6-stelligem Supabase-OTP (Code in E-Mail, kein Magic-Link)
-- Supabase Dashboard:
-- 1) Authentication -> Providers -> Email -> Enable Email provider
-- 2) Authentication -> Email -> OTP expiry = 1800 (30 Minuten)
-- 3) Authentication -> Providers -> Anonymous Sign-Ins aktivieren (Gast-Modus)
-- 4) Authentication -> Email Templates -> Magic Link:
--    Inhalt aus supabase/email-templates/mekkz-otp.html einfügen ({{ .Token }}, kein ConfirmationURL)
-- 5) App-Code: signInWithOtp ohne emailRedirectTo aufrufen (sonst Link statt Code)

create table if not exists public.pending_registrations (
  email text primary key,
  password_hash text not null,
  code_hash text not null,
  expires_at timestamp with time zone not null,
  attempts integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create index if not exists pending_registrations_expires_at_idx
  on public.pending_registrations (expires_at);

alter table public.pending_registrations enable row level security;
