-- Ultra Creator status (100k+ followers, blue X badge)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_ultra_creator BOOLEAN NOT NULL DEFAULT FALSE;
