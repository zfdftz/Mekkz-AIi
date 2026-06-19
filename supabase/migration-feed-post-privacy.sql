-- Feed post privacy: owner-only visibility when is_private = true
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_feed_posts_user_created
  ON public.feed_posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_posts_public_feed
  ON public.feed_posts(created_at DESC)
  WHERE is_private = false;
