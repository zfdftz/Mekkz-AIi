-- Community & productivity platform for Mekkz AI
-- Run in Supabase SQL Editor after existing migrations.

-- ========== PROFILES ==========
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  messages_sent INT NOT NULL DEFAULT 0,
  posts_count INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  username_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_lower_idx
  ON user_profiles (LOWER(username))
  WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== FRIENDS ==========
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS friend_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== CHAT ROOMS ==========
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT DEFAULT '',
  rules TEXT DEFAULT '',
  pinned_message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_pinned_message_id_fkey;
ALTER TABLE chat_rooms
  ADD CONSTRAINT chat_rooms_pinned_message_id_fkey
  FOREIGN KEY (pinned_message_id) REFERENCES chat_room_messages(id) ON DELETE SET NULL;

-- ========== GROUP CHATS ==========
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_chat_members (
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'ai')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL DEFAULT FALSE,
  thread_parent_id UUID REFERENCES group_chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== COMMUNITY FEED ==========
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'prompt', 'story', 'ai_output', 'result')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  reposts_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_likes (
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- ========== PRODUCTIVITY ==========
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_at TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  recurrence TEXT,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brainstorm_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Brainstorm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brainstorm_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES brainstorm_boards(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'text' CHECK (node_type IN ('text', 'sticky', 'ai')),
  content TEXT NOT NULL,
  pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION NOT NULL DEFAULT 220,
  height DOUBLE PRECISION NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default public rooms
INSERT INTO chat_rooms (slug, name, topic, description, rules)
VALUES
  ('gaming', 'Gaming Lounge', 'Gaming', 'Talk games, builds, and esports.', 'Be respectful. No spam.'),
  ('school', 'School & Study', 'School', 'Homework help and study groups.', 'Help others learn. No cheating requests.'),
  ('coding', 'Dev Corner', 'Coding', 'Programming, AI, and projects.', 'Share code snippets. Credit sources.'),
  ('business', 'Business Hub', 'Business', 'Startups, marketing, and growth.', 'No unsolicited ads.'),
  ('ai-prompts', 'Prompt Lab', 'AI Prompts', 'Share prompts, techniques, and Mekkz AI tips.', 'Credit original prompts. No prompt spam.'),
  ('creative', 'Creative Studio', 'Creative', 'Art, stories, music, and design inspiration.', 'Share your work. Constructive feedback only.'),
  ('feedback', 'Feedback & Ideas', 'Feedback', 'Suggest features and improvements for Mekkz AI.', 'One idea per message. Stay constructive.'),
  ('support', 'Help Desk', 'Support', 'Questions about Mekkz AI and community features.', 'Search before asking. Be patient with helpers.'),
  ('memes', 'Memes & Fun', 'Fun', 'Casual humor, memes, and off-topic banter.', 'Keep it friendly. No offensive content.'),
  ('fitness', 'Health & Fitness', 'Fitness', 'Workouts, nutrition, and wellness tips.', 'No medical advice. Encourage, don''t shame.'),
  ('travel', 'Travel & Culture', 'Travel', 'Trips, destinations, and cultural exchange.', 'Share experiences. Respect local cultures.'),
  ('movies', 'Movies & Series', 'Entertainment', 'Film, TV, anime, and streaming recommendations.', 'Use spoiler tags. Respect differing tastes.'),
  ('tech-news', 'Tech & AI News', 'Tech News', 'Latest tech, AI releases, and industry discussion.', 'Link sources. No clickbait.'),
  ('language', 'Language Practice', 'Languages', 'Practice languages and help others learn.', 'Correct gently. Stay inclusive.'),
  ('intro', 'Introductions', 'Community', 'Introduce yourself to the Mekkz AI community.', 'Tell us your interests. Welcome newcomers.')
ON CONFLICT (slug) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_tags ON feed_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_room_messages_room ON chat_room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_user_cooldown ON chat_room_messages(room_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_messages_pair ON friend_messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_nodes ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write
DROP POLICY IF EXISTS user_profiles_read ON user_profiles;
CREATE POLICY user_profiles_read ON user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS user_profiles_write ON user_profiles;
CREATE POLICY user_profiles_write ON user_profiles FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_presence_read ON user_presence;
CREATE POLICY user_presence_read ON user_presence FOR SELECT USING (true);
DROP POLICY IF EXISTS user_presence_write ON user_presence;
CREATE POLICY user_presence_write ON user_presence FOR ALL USING (auth.uid() = user_id);

-- Feed: public read, own write
DROP POLICY IF EXISTS feed_posts_read ON feed_posts;
CREATE POLICY feed_posts_read ON feed_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS feed_posts_write ON feed_posts;
CREATE POLICY feed_posts_write ON feed_posts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS feed_likes_all ON feed_likes;
CREATE POLICY feed_likes_all ON feed_likes FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS feed_comments_read ON feed_comments;
CREATE POLICY feed_comments_read ON feed_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS feed_comments_write ON feed_comments;
CREATE POLICY feed_comments_write ON feed_comments FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS feed_reposts_all ON feed_reposts;
CREATE POLICY feed_reposts_all ON feed_reposts FOR ALL USING (auth.uid() = user_id);

-- Rooms: public read
DROP POLICY IF EXISTS chat_rooms_read ON chat_rooms;
CREATE POLICY chat_rooms_read ON chat_rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS chat_room_members_all ON chat_room_members;
CREATE POLICY chat_room_members_all ON chat_room_members FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS chat_room_messages_read ON chat_room_messages;
CREATE POLICY chat_room_messages_read ON chat_room_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS chat_room_messages_write ON chat_room_messages;
CREATE POLICY chat_room_messages_write ON chat_room_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Friends
DROP POLICY IF EXISTS friend_requests_all ON friend_requests;
CREATE POLICY friend_requests_all ON friend_requests FOR ALL
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS friendships_all ON friendships;
CREATE POLICY friendships_all ON friendships FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
DROP POLICY IF EXISTS friend_messages_all ON friend_messages;
CREATE POLICY friend_messages_all ON friend_messages FOR ALL
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Groups
DROP POLICY IF EXISTS group_chats_read ON group_chats;
CREATE POLICY group_chats_read ON group_chats FOR SELECT USING (true);
DROP POLICY IF EXISTS group_chat_members_all ON group_chat_members;
CREATE POLICY group_chat_members_all ON group_chat_members FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS group_chat_messages_read ON group_chat_messages;
CREATE POLICY group_chat_messages_read ON group_chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS group_chat_messages_write ON group_chat_messages;
CREATE POLICY group_chat_messages_write ON group_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id OR is_ai = true);

-- Productivity: own data only
DROP POLICY IF EXISTS tasks_own ON tasks;
CREATE POLICY tasks_own ON tasks FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS calendar_events_own ON calendar_events;
CREATE POLICY calendar_events_own ON calendar_events FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS reminders_own ON reminders;
CREATE POLICY reminders_own ON reminders FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS note_folders_own ON note_folders;
CREATE POLICY note_folders_own ON note_folders FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS notes_own ON notes;
CREATE POLICY notes_own ON notes FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS brainstorm_boards_own ON brainstorm_boards;
CREATE POLICY brainstorm_boards_own ON brainstorm_boards FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS brainstorm_nodes_own ON brainstorm_nodes;
CREATE POLICY brainstorm_nodes_own ON brainstorm_nodes FOR ALL
  USING (EXISTS (SELECT 1 FROM brainstorm_boards b WHERE b.id = board_id AND b.user_id = auth.uid()));

-- Realtime publication (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE friend_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE feed_posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
