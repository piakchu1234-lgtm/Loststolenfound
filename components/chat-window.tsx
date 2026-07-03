'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Send, Image as ImageIcon, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Message,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToConversationMessages,
  uploadMessageAttachment,
} from '@/lib/messaging'
import { formatDistanceToNow } from 'date-fns'

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  otherUserName?: string
}

export function ChatWindow({
  conversationId,
  currentUserId,
  otherUserName,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Load messages
  useEffect(() => {
    loadMessages()
    markAsRead()

    // Subscribe to new messages
    const unsubscribe = subscribeToConversationMessages(
      conversationId,
      (message) => {
        setMessages((prev) => [...prev, message])
        if (message.sender_id !== currentUserId) {
          markAsRead()
        }
      }
    )

    return unsubscribe
  }, [conversationId, currentUserId])

  async function loadMessages() {
    setLoading(true)
    const { data, error } = await getConversationMessages(conversationId, 100)
    if (data) {
      setMessages(data)
    }
    if (error) {
      console.error('Failed to load messages:', error)
    }
    setLoading(false)
  }

  async function markAsRead() {
    await markMessagesAsRead(conversationId, currentUserId)
  }

  async function handleSend() {
    if (!newMessage.trim() || sending) return

    setSending(true)
    const { error } = await sendMessage(
      conversationId,
      currentUserId,
      newMessage.trim()
    )

    if (!error) {
      setNewMessage('')
    } else {
      console.error('Failed to send message:', error)
    }
    setSending(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { url, error } = await uploadMessageAttachment(file, conversationId)

    if (url) {
      await sendMessage(
        conversationId,
        currentUserId,
        undefined,
        [url],
        'image'
      )
    } else {
      console.error('Failed to upload image:', error)
    }
    setUploading(false)
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <MessageCircle className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading messages...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar>
          <AvatarFallback>
            {otherUserName?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{otherUserName || 'User'}</h3>
          <p className="text-sm text-gray-500">Active</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === currentUserId
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isOwn
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-2">
                        {message.attachments.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Attachment"
                            className="rounded max-w-full"
                          />
                        ))}
                      </div>
                    )}
                    {message.content && (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <Button
            variant="ghost"
            size="icon"
            asChild
            disabled={uploading}
          >
            <label htmlFor="image-upload" className="cursor-pointer">
              <ImageIcon className="h-5 w-5" />
            </label>
          </Button>

          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={sending || uploading}
            className="flex-1"
          />

          <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {uploading && (
          <p className="text-sm text-gray-500 mt-2">Uploading image...</p>
        )}
      </div>
    </Card>
  )
}
