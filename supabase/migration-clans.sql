-- Clan tables for Mekkz AI Community
-- Run in Supabase SQL Editor or: npm run migrate:clans

CREATE TABLE IF NOT EXISTS clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  member_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_members (
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clan_id, user_id)
);

CREATE TABLE IF NOT EXISTS clan_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clan_id, user_id)
);

CREATE TABLE IF NOT EXISTS clan_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clan_id, user_id)
);

CREATE TABLE IF NOT EXISTS clan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clans_owner_idx ON clans (owner_id);
CREATE INDEX IF NOT EXISTS clan_members_user_idx ON clan_members (user_id);
CREATE INDEX IF NOT EXISTS clan_messages_clan_idx ON clan_messages (clan_id, created_at);

-- One clan per user
CREATE UNIQUE INDEX IF NOT EXISTS clan_members_one_clan_per_user_idx ON clan_members (user_id);

ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clans' AND policyname = 'Public read clans'
  ) THEN
    CREATE POLICY "Public read clans" ON clans FOR SELECT USING (is_public = TRUE OR auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clan_members' AND policyname = 'Public read clan members'
  ) THEN
    CREATE POLICY "Public read clan members" ON clan_members FOR SELECT USING (TRUE);
  END IF;
END $$;
