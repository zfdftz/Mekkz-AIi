-- Public community chat rooms (~15) + cooldown query index
-- Safe to re-run: uses ON CONFLICT (slug) DO NOTHING

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

CREATE INDEX IF NOT EXISTS idx_room_messages_user_cooldown
  ON chat_room_messages(room_id, user_id, created_at DESC);
