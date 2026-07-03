-- Direct Messaging System Migration
-- Creates tables for 1-on-1 conversations and messages

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Conversations Table
-- =====================================================
-- Stores conversation metadata between two users

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Participants (always exactly 2 users)
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Optional: link to a pin/claim that started the conversation
    pin_id UUID REFERENCES "MapPin"(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,

    -- Last message info (denormalized for performance)
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_sender_id UUID REFERENCES auth.users(id),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure user1_id < user2_id to avoid duplicate conversations
    CONSTRAINT ordered_participants CHECK (user1_id < user2_id),

    -- Unique constraint: only one conversation per user pair
    CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id)
);

-- Indexes for performance
CREATE INDEX idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX idx_conversations_pin ON conversations(pin_id) WHERE pin_id IS NOT NULL;
CREATE INDEX idx_conversations_claim ON conversations(claim_id) WHERE claim_id IS NOT NULL;
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

-- =====================================================
-- Messages Table
-- =====================================================
-- Stores all messages within conversations

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Conversation reference
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Sender
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Message content
    content TEXT,

    -- Attachments (array of URLs from Supabase Storage)
    attachments TEXT[] DEFAULT '{}',

    -- Message type
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),

    -- Read status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- At least one of content or attachments must be present
    CONSTRAINT has_content CHECK (
        content IS NOT NULL OR
        (attachments IS NOT NULL AND array_length(attachments, 1) > 0)
    )
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read) WHERE read = FALSE;
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
-- Users can see conversations they are part of
CREATE POLICY "Users can view their own conversations"
    ON conversations FOR SELECT
    USING (
        auth.uid() = user1_id OR
        auth.uid() = user2_id
    );

-- Users can create conversations (but must be one of the participants)
CREATE POLICY "Users can create conversations they are part of"
    ON conversations FOR INSERT
    WITH CHECK (
        auth.uid() = user1_id OR
        auth.uid() = user2_id
    );

-- Users can update conversations they are part of
CREATE POLICY "Users can update their own conversations"
    ON conversations FOR UPDATE
    USING (
        auth.uid() = user1_id OR
        auth.uid() = user2_id
    );

-- Messages Policies
-- Users can see messages in conversations they are part of
CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
        )
    );

-- Users can send messages in conversations they are part of
CREATE POLICY "Users can send messages in their conversations"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
        )
    );

-- Users can update their own messages (for read status, edit, etc.)
CREATE POLICY "Users can update messages in their conversations"
    ON messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
        )
    );

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
    ON messages FOR DELETE
    USING (sender_id = auth.uid());

-- =====================================================
-- Functions
-- =====================================================

-- Function: Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_user1_id UUID,
    p_user2_id UUID,
    p_pin_id UUID DEFAULT NULL,
    p_claim_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conversation_id UUID;
    v_ordered_user1_id UUID;
    v_ordered_user2_id UUID;
BEGIN
    -- Ensure user1_id < user2_id
    IF p_user1_id < p_user2_id THEN
        v_ordered_user1_id := p_user1_id;
        v_ordered_user2_id := p_user2_id;
    ELSE
        v_ordered_user1_id := p_user2_id;
        v_ordered_user2_id := p_user1_id;
    END IF;

    -- Try to find existing conversation
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE user1_id = v_ordered_user1_id
    AND user2_id = v_ordered_user2_id;

    -- If not found, create new conversation
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (user1_id, user2_id, pin_id, claim_id)
        VALUES (v_ordered_user1_id, v_ordered_user2_id, p_pin_id, p_claim_id)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$;

-- Function: Update conversation's last message info
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update conversation with last message info
    UPDATE conversations
    SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(COALESCE(NEW.content, '[Attachment]'), 100),
        last_message_sender_id = NEW.sender_id,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

-- Trigger: Update conversation when new message is sent
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function: Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS TABLE (
    conversation_id UUID,
    unread_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        m.conversation_id,
        COUNT(*) as unread_count
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    WHERE
        m.read = FALSE
        AND m.sender_id != p_user_id
        AND (c.user1_id = p_user_id OR c.user2_id = p_user_id)
    GROUP BY m.conversation_id;
$$;

-- Function: Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Mark all unread messages from the other user as read
    UPDATE messages
    SET
        read = TRUE,
        read_at = NOW()
    WHERE
        conversation_id = p_conversation_id
        AND sender_id != p_user_id
        AND read = FALSE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE conversations IS 'Stores 1-on-1 conversations between users';
COMMENT ON TABLE messages IS 'Stores all messages within conversations';
COMMENT ON FUNCTION get_or_create_conversation IS 'Gets existing conversation or creates new one between two users';
COMMENT ON FUNCTION update_conversation_last_message IS 'Updates conversation metadata when new message is sent';
COMMENT ON FUNCTION get_unread_message_count IS 'Returns unread message count per conversation for a user';
COMMENT ON FUNCTION mark_messages_as_read IS 'Marks all messages in a conversation as read for a user';
