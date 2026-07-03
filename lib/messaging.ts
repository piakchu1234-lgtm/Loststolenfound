import { createClient } from '@/lib/supabase/client'

export interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  pin_id?: string | null
  claim_id?: string | null
  last_message_at?: string | null
  last_message_preview?: string | null
  last_message_sender_id?: string | null
  created_at: string
  updated_at: string
  // Populated fields
  other_user?: {
    id: string
    email?: string
    user_metadata?: any
  }
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content?: string | null
  attachments?: string[]
  message_type: 'text' | 'image' | 'location' | 'system'
  read: boolean
  read_at?: string | null
  metadata?: any
  created_at: string
  updated_at: string
  // Populated fields
  sender?: {
    id: string
    email?: string
    user_metadata?: any
  }
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string,
  pinId?: string,
  claimId?: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_user1_id: userId1,
      p_user2_id: userId2,
      p_pin_id: pinId || null,
      p_claim_id: claimId || null,
    })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[Messaging] getOrCreateConversation error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get user's conversations with populated data
 */
export async function getUserConversations(
  userId: string
): Promise<{ data: Conversation[] | null; error: Error | null }> {
  try {
    const supabase = createClient()

    // Get conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (convError) throw convError
    if (!conversations) return { data: [], error: null }

    // Get unread counts
    const { data: unreadCounts, error: unreadError } = await supabase.rpc(
      'get_unread_message_count',
      { p_user_id: userId }
    )

    if (unreadError) {
      console.warn('[Messaging] Failed to get unread counts:', unreadError)
    }

    // Get other user details for each conversation
    const otherUserIds = conversations.map((conv) =>
      conv.user1_id === userId ? conv.user2_id : conv.user1_id
    )

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, user_metadata')
      .in('id', otherUserIds)

    if (usersError) {
      console.warn('[Messaging] Failed to get user details:', usersError)
    }

    // Combine data
    const enrichedConversations: Conversation[] = conversations.map((conv) => {
      const otherUserId =
        conv.user1_id === userId ? conv.user2_id : conv.user1_id
      const otherUser = users?.find((u) => u.id === otherUserId)
      const unread = unreadCounts?.find((u) => u.conversation_id === conv.id)

      return {
        ...conv,
        other_user: otherUser || { id: otherUserId },
        unread_count: unread?.unread_count || 0,
      }
    })

    return { data: enrichedConversations, error: null }
  } catch (error) {
    console.error('[Messaging] getUserConversations error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get messages in a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (messagesError) throw messagesError
    if (!messages) return { data: [], error: null }

    // Get sender details
    const senderIds = [...new Set(messages.map((m) => m.sender_id))]
    const { data: senders, error: sendersError } = await supabase
      .from('profiles')
      .select('id, email, user_metadata')
      .in('id', senderIds)

    if (sendersError) {
      console.warn('[Messaging] Failed to get sender details:', sendersError)
    }

    // Combine data (reverse to chronological order)
    const enrichedMessages: Message[] = messages
      .map((msg) => ({
        ...msg,
        sender: senders?.find((s) => s.id === msg.sender_id) || {
          id: msg.sender_id,
        },
      }))
      .reverse()

    return { data: enrichedMessages, error: null }
  } catch (error) {
    console.error('[Messaging] getConversationMessages error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content?: string,
  attachments?: string[],
  messageType: 'text' | 'image' | 'location' | 'system' = 'text',
  metadata?: any
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    const supabase = createClient()

    // Validate: must have content or attachments
    if (!content && (!attachments || attachments.length === 0)) {
      throw new Error('Message must have content or attachments')
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content || null,
        attachments: attachments || [],
        message_type: messageType,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) throw error

    return { data: message, error: null }
  } catch (error) {
    console.error('[Messaging] sendMessage error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Mark messages as read in a conversation
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    })

    if (error) throw error

    return { count: data || 0, error: null }
  } catch (error) {
    console.error('[Messaging] markMessagesAsRead error:', error)
    return { count: 0, error: error as Error }
  }
}

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToConversationMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message)
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to conversation updates (for conversation list)
 */
export function subscribeToUserConversations(
  userId: string,
  callback: () => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel(`user-conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `user1_id=eq.${userId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `user2_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Upload image attachment
 */
export async function uploadMessageAttachment(
  file: File,
  conversationId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const supabase = createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${conversationId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('message-attachments').getPublicUrl(data.path)

    return { url: publicUrl, error: null }
  } catch (error) {
    console.error('[Messaging] uploadMessageAttachment error:', error)
    return { url: null, error: error as Error }
  }
}
