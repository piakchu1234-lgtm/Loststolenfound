-- ============================================
-- FORUM & DISCUSSION SYSTEM
-- Complete forum functionality with comments, threads, and moderation
-- ============================================

-- ============================================
-- 1. COMMENTS TABLE (Pin Comments)
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID REFERENCES "MapPin"(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- ============================================
-- 2. FORUM THREADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- general, tips, success-stories, help
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- ============================================
-- 3. FORUM REPLIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false, -- Mark as solution to thread
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- ============================================
-- 4. COMMENT VOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (1, -1)), -- 1 = upvote, -1 = downvote
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(comment_id, user_id)
);

-- ============================================
-- 5. FORUM REPLY VOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS forum_reply_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(reply_id, user_id)
);

-- ============================================
-- 6. MODERATION LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'delete_comment', 'delete_thread', 'lock_thread', 'ban_user', etc.
  target_type TEXT NOT NULL, -- 'comment', 'thread', 'reply', 'user'
  target_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_pin_id ON comments(pin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Forum threads indexes
CREATE INDEX IF NOT EXISTS idx_forum_threads_slug ON forum_threads(slug);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned ON forum_threads(is_pinned, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_activity ON forum_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created ON forum_threads(created_at DESC);

-- Forum replies indexes
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON forum_replies(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_solution ON forum_replies(thread_id, is_solution) WHERE is_solution = true;

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user ON comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_reply_votes_reply ON forum_reply_votes(reply_id);
CREATE INDEX IF NOT EXISTS idx_forum_reply_votes_user ON forum_reply_votes(user_id);

-- Moderation log index
CREATE INDEX IF NOT EXISTS idx_moderation_log_created ON moderation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_log_target ON moderation_log(target_type, target_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reply_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - COMMENTS
-- ============================================

CREATE POLICY "Anyone can view non-deleted comments" ON comments
  FOR SELECT USING (is_deleted = false OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - FORUM THREADS
-- ============================================

CREATE POLICY "Anyone can view non-deleted threads" ON forum_threads
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create threads" ON forum_threads
  FOR INSERT WITH CHECK (auth.uid() = author_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update own threads" ON forum_threads
  FOR UPDATE USING (auth.uid() = author_id AND is_locked = false);

CREATE POLICY "Authors can delete own threads" ON forum_threads
  FOR DELETE USING (auth.uid() = author_id);

-- ============================================
-- RLS POLICIES - FORUM REPLIES
-- ============================================

CREATE POLICY "Anyone can view non-deleted replies" ON forum_replies
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create replies on unlocked threads" ON forum_replies
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM forum_threads
      WHERE id = thread_id AND is_locked = false AND is_deleted = false
    )
  );

CREATE POLICY "Authors can update own replies" ON forum_replies
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own replies" ON forum_replies
  FOR DELETE USING (auth.uid() = author_id);

-- ============================================
-- RLS POLICIES - VOTES
-- ============================================

CREATE POLICY "Anyone can view votes" ON comment_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote on comments" ON comment_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own votes" ON comment_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON comment_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reply votes" ON forum_reply_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote on replies" ON forum_reply_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own reply votes" ON forum_reply_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reply votes" ON forum_reply_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - MODERATION LOG
-- ============================================

CREATE POLICY "Only moderators can view moderation log" ON moderation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'moderator'
    )
  );

CREATE POLICY "Only moderators can insert moderation log" ON moderation_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'moderator'
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote = 1 THEN
      UPDATE comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote = 1 AND NEW.vote = -1 THEN
      UPDATE comments SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    ELSIF OLD.vote = -1 AND NEW.vote = 1 THEN
      UPDATE comments SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote = 1 THEN
      UPDATE comments SET upvotes = upvotes - 1 WHERE id = OLD.comment_id;
    ELSE
      UPDATE comments SET downvotes = downvotes - 1 WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update reply vote counts
CREATE OR REPLACE FUNCTION update_reply_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote = 1 THEN
      UPDATE forum_replies SET upvotes = upvotes + 1 WHERE id = NEW.reply_id;
    ELSE
      UPDATE forum_replies SET downvotes = downvotes + 1 WHERE id = NEW.reply_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote = 1 AND NEW.vote = -1 THEN
      UPDATE forum_replies SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.reply_id;
    ELSIF OLD.vote = -1 AND NEW.vote = 1 THEN
      UPDATE forum_replies SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.reply_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote = 1 THEN
      UPDATE forum_replies SET upvotes = upvotes - 1 WHERE id = OLD.reply_id;
    ELSE
      UPDATE forum_replies SET downvotes = downvotes - 1 WHERE id = OLD.reply_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update thread reply count and last activity
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
    SET reply_count = reply_count + 1,
        last_activity_at = NEW.created_at
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment thread view count
CREATE OR REPLACE FUNCTION increment_thread_views(thread_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE forum_threads
  SET view_count = view_count + 1
  WHERE id = thread_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for comment votes
CREATE TRIGGER trigger_comment_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION update_comment_vote_counts();

-- Trigger for reply votes
CREATE TRIGGER trigger_reply_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON forum_reply_votes
  FOR EACH ROW EXECUTE FUNCTION update_reply_vote_counts();

-- Trigger for thread stats
CREATE TRIGGER trigger_thread_stats
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_thread_stats();

-- Trigger for updated_at on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on forum_threads
CREATE TRIGGER update_forum_threads_updated_at
  BEFORE UPDATE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on forum_replies
CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE comments IS 'Comments on map pins/incidents';
COMMENT ON TABLE forum_threads IS 'Forum discussion threads';
COMMENT ON TABLE forum_replies IS 'Replies to forum threads';
COMMENT ON TABLE comment_votes IS 'User votes on comments';
COMMENT ON TABLE forum_reply_votes IS 'User votes on forum replies';
COMMENT ON TABLE moderation_log IS 'Log of moderation actions';

COMMENT ON COLUMN comments.parent_id IS 'Parent comment for nested replies';
COMMENT ON COLUMN forum_replies.is_solution IS 'Mark reply as solution to thread question';
COMMENT ON COLUMN forum_threads.is_pinned IS 'Pinned threads appear at top';
COMMENT ON COLUMN forum_threads.is_locked IS 'Locked threads cannot receive new replies';
