'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Conversation,
  getUserConversations,
  subscribeToUserConversations,
} from '@/lib/messaging'
import { formatDistanceToNow } from 'date-fns'

interface ConversationListProps {
  userId: string
  onSelectConversation: (conversation: Conversation) => void
  selectedConversationId?: string
}

export function ConversationList({
  userId,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadConversations()

    // Subscribe to conversation updates
    const unsubscribe = subscribeToUserConversations(userId, () => {
      loadConversations()
    })

    return unsubscribe
  }, [userId])

  async function loadConversations() {
    const { data, error } = await getUserConversations(userId)
    if (data) {
      setConversations(data)
    }
    if (error) {
      console.error('Failed to load conversations:', error)
    }
    setLoading(false)
  }

  const filteredConversations = conversations.filter((conv) => {
    const otherUserName =
      conv.other_user?.user_metadata?.name ||
      conv.other_user?.email ||
      'Unknown'
    return otherUserName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <Card className="h-[600px] p-4">
        <div className="flex items-center justify-center h-full">
          <MessageCircle className="h-8 w-8 animate-spin" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="text-center text-gray-500 py-8 px-4">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>
              {searchQuery
                ? 'No conversations found'
                : 'No conversations yet. Start chatting!'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const otherUser = conversation.other_user
              const userName =
                otherUser?.user_metadata?.name ||
                otherUser?.email?.split('@')[0] ||
                'Unknown User'
              const isSelected = conversation.id === selectedConversationId
              const unreadCount = conversation.unread_count || 0

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="shrink-0">
                      <AvatarFallback>
                        {userName[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">{userName}</h3>
                        {conversation.last_message_at && (
                          <span className="text-xs text-gray-500 shrink-0 ml-2">
                            {formatDistanceToNow(
                              new Date(conversation.last_message_at),
                              { addSuffix: false }
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conversation.last_message_preview || 'Start a conversation'}
                        </p>
                        {unreadCount > 0 && (
                          <Badge
                            variant="default"
                            className="ml-2 shrink-0 h-5 min-w-5 flex items-center justify-center"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  )
}
