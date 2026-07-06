import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export interface Comment {
  id: string;
  pin_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

export interface ForumThread {
  id: string;
  title: string;
  slug: string;
  content: string;
  author_id: string;
  category: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  view_count: number;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

export interface ForumReply {
  id: string;
  thread_id: string;
  author_id: string;
  parent_id?: string;
  content: string;
  is_solution: boolean;
  is_deleted: boolean;
  edited_at?: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

// ============================================
// COMMENTS (Pin Comments)
// ============================================

/**
 * Get comments for a specific pin
 */
export async function getComments(pinId: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(display_name, avatar_url)')
      .eq('pin_id', pinId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

/**
 * Create a new comment
 */
export async function createComment(
  pinId: string,
  content: string,
  parentId?: string
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('comments')
      .insert({
        pin_id: pinId,
        user_id: user.id,
        parent_id: parentId || null,
        content: content.trim(),
      })
      .select('*, profiles(display_name, avatar_url)')
      .single();

    if (error) throw error;
    return { success: true, comment: data };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating comment:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Vote on a comment
 */
export async function voteComment(
  commentId: string,
  vote: 1 | -1
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('comment_votes')
      .upsert({
        comment_id: commentId,
        user_id: user.id,
        vote,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error voting on comment:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// FORUM THREADS
// ============================================

/**
 * Get all forum threads
 */
export async function getForumThreads(
  category?: string,
  limit: number = 50
): Promise<ForumThread[]> {
  try {
    let query = supabase
      .from('forum_threads')
      .select('*, profiles(display_name, avatar_url)')
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('last_activity_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching forum threads:', error);
    return [];
  }
}

/**
 * Get a single forum thread by slug
 */
export async function getForumThread(slug: string): Promise<ForumThread | null> {
  try {
    const { data, error } = await supabase
      .from('forum_threads')
      .select('*, profiles(display_name, avatar_url)')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    // Increment view count
    if (data) {
      await supabase.rpc('increment_thread_views', { thread_id_param: data.id });
    }

    return data;
  } catch (error) {
    console.error('Error fetching forum thread:', error);
    return null;
  }
}

/**
 * Create a new forum thread
 */
export async function createForumThread(
  title: string,
  content: string,
  category: string = 'general'
): Promise<{ success: boolean; thread?: ForumThread; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100) + '-' + Date.now();

    const { data, error } = await supabase
      .from('forum_threads')
      .insert({
        title: title.trim(),
        slug,
        content: content.trim(),
        author_id: user.id,
        category,
      })
      .select('*, profiles(display_name, avatar_url)')
      .single();

    if (error) throw error;
    return { success: true, thread: data };
  } catch (error) {
    console.error('Error creating forum thread:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a forum thread
 */
export async function updateForumThread(
  threadId: string,
  updates: { title?: string; content?: string; category?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('forum_threads')
      .update(updates)
      .eq('id', threadId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating forum thread:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a forum thread (soft delete)
 */
export async function deleteForumThread(threadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('forum_threads')
      .update({ is_deleted: true })
      .eq('id', threadId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting forum thread:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// FORUM REPLIES
// ============================================

/**
 * Get replies for a forum thread
 */
export async function getForumReplies(threadId: string): Promise<ForumReply[]> {
  try {
    const { data, error } = await supabase
      .from('forum_replies')
      .select('*, profiles(display_name, avatar_url)')
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching forum replies:', error);
    return [];
  }
}

/**
 * Create a forum reply
 */
export async function createForumReply(
  threadId: string,
  content: string,
  parentId?: string
): Promise<{ success: boolean; reply?: ForumReply; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        thread_id: threadId,
        author_id: user.id,
        parent_id: parentId || null,
        content: content.trim(),
      })
      .select('*, profiles(display_name, avatar_url)')
      .single();

    if (error) throw error;
    return { success: true, reply: data };
  } catch (error) {
    console.error('Error creating forum reply:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Mark a reply as solution
 */
export async function markAsSolution(replyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('forum_replies')
      .update({ is_solution: true })
      .eq('id', replyId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking reply as solution:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Vote on a forum reply
 */
export async function voteForumReply(
  replyId: string,
  vote: 1 | -1
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('forum_reply_votes')
      .upsert({
        reply_id: replyId,
        user_id: user.id,
        vote,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error voting on forum reply:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// FORUM CATEGORIES
// ============================================

export const FORUM_CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: '🌐' },
  { id: 'general', label: 'General Discussion', icon: '💬' },
  { id: 'tips', label: 'Tips & Advice', icon: '💡' },
  { id: 'success-stories', label: 'Success Stories', icon: '🎉' },
  { id: 'help', label: 'Help & Support', icon: '🆘' },
] as const;
