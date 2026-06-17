-- User moderation fields (warnings, timed bans)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS moderation_warning TEXT,
  ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS user_profiles_banned_until_idx ON user_profiles (banned_until);
