-- Community social v2: followers, feed media, plan tracking
-- Run in Supabase SQL Editor after migration-community-platform.sql

ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'none'
    CHECK (media_type IN ('none', 'image', 'video'));

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_followers (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_followers_following ON user_followers(following_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_likes ON feed_posts(likes_count DESC);

ALTER TABLE user_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_followers_read ON user_followers;
CREATE POLICY user_followers_read ON user_followers FOR SELECT USING (true);

DROP POLICY IF EXISTS user_followers_write ON user_followers;
CREATE POLICY user_followers_write ON user_followers FOR ALL
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);
