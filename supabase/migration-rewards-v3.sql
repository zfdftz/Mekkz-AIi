-- Chosen One status (admin-granted red checkmark)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_chosen BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin-granted titles (without completing quests)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS admin_granted_titles TEXT[] NOT NULL DEFAULT '{}';
