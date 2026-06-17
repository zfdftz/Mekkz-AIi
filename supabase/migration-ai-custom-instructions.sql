-- Custom AI behavior instructions in settings (replaces manual memory UI)
alter table public.user_ai_preferences
  add column if not exists custom_instructions text not null default '';
