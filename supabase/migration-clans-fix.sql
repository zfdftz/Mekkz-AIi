-- Clans fix: one clan per user
-- Run after migration-rewards-v2.sql

CREATE UNIQUE INDEX IF NOT EXISTS clan_members_one_user_idx ON clan_members (user_id);
