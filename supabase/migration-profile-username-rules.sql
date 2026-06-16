-- Profile username cooldown + case-insensitive uniqueness
-- Run in Supabase SQL Editor after migration-community-platform.sql

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

-- Existing users may change username once; cooldown starts after first manual change.
UPDATE user_profiles
SET username_changed_at = NULL
WHERE username_changed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_lower_idx
  ON user_profiles (LOWER(username))
  WHERE username IS NOT NULL;
