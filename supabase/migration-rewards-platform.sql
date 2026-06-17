-- Mekkz AI Rewards: badges, titles, cosmetics, daily crates, seasons
-- Run after migration-community-platform.sql

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_frame TEXT,
  ADD COLUMN IF NOT EXISTS profile_background TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#8b5cf6',
  ADD COLUMN IF NOT EXISTS active_title TEXT,
  ADD COLUMN IF NOT EXISTS showcased_badge_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_creator BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS animated_avatar BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT NOT NULL DEFAULT 'system',
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS user_inventory (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('frame', 'theme', 'background', 'character')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  season_index INT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS user_crate_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_opened_at TIMESTAMPTZ,
  total_opens INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON user_badges (user_id);
CREATE INDEX IF NOT EXISTS user_inventory_user_idx ON user_inventory (user_id, item_type);
