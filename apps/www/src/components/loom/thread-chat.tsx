"use client"

import { useEffect, useState } from 'react'
import { Hash, Lock } from 'lucide-react'
import { ExpandableChatHeader } from '@shadcn-chat/ui'
import { ChatList } from '../chat/chat-list'
import ChatBottombar from '../chat/chat-bottombar'
import useChatStore from '@/hooks/useChatStore'
import { useAuth } from '@/hooks/useAuth'
import { getThreadMessages, subscribeToThreadMessages, markThreadMessagesAsRead, sendThreadMessage } from '@/lib/services/threads'
import { subscribeToTypingIndicator } from '@/lib/services/presence'
import type { TypingState } from '@/lib/services/presence'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Thread, Loom, ConversationWithUser } from '@/app/data'
import type { AttachmentData } from '@/lib/services/attachments'

interface ThreadChatProps {
  thread: Thread
  loom: Loom
  isMobile: boolean
}

export function ThreadChat({ thread, loom, isMobile }: ThreadChatProps) {
  const { user } = useAuth()
  const threadMessages = useChatStore((state) => state.threadMessages)
  const setThreadMessages = useChatStore((state) => state.setThreadMessages)
  const addThreadMessage = useChatStore((state) => state.addThreadMessage)
  const setLoading = useChatStore((state) => state.setLoomLoading)
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([])
  const [typingChannel, setTypingChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!thread || !user) return

    setLoading(true)
    getThreadMessages(thread.id).then((data) => {
      setThreadMessages(data)
      setLoading(false)
      markThreadMessagesAsRead(thread.id, user.id)
    })

    const unsubscribe = subscribeToThreadMessages(thread.id, (message) => {
      addThreadMessage(message)
      if (message.sender_id !== user.id) {
        markThreadMessagesAsRead(thread.id, user.id)
      }
    })

    const channel = subscribeToTypingIndicator(
      `thread:${thread.id}`,
      user.id,
      (typing) => setTypingUsers(typing)
    )
    setTypingChannel(channel)

    return () => {
      unsubscribe()
      if (channel) channel.unsubscribe()
    }
  }, [thread.id, user?.id])

  const conversationShim: ConversationWithUser = {
    id: thread.id,
    created_at: thread.created_at,
    user1_id: thread.created_by,
    user2_id: thread.created_by,
    is_group: false,
    name: thread.name,
    created_by: thread.created_by,
    last_message: thread.last_message,
  }

  const customSend = async (
    _conversationId: string,
    content: string,
    senderId: string,
    attachment?: AttachmentData,
    replyToId?: string
  ) => {
    const msg = await sendThreadMessage(thread.id, content, senderId, attachment, replyToId)
    if (msg) addThreadMessage(msg)
    return msg
  }

  return (
    <div className="flex flex-col justify-between w-full h-full">
      <ExpandableChatHeader className="px-2 py-3 sm:px-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
            {thread.type === 'private' ? (
              <Lock size={16} className="text-black/60 dark:text-white/60" />
            ) : (
              <Hash size={16} className="text-black/60 dark:text-white/60" />
            )}
          </div>
          <div className="flex flex-col text-left flex-1 min-w-0">
            <span className="font-medium text-sm truncate">{thread.name}</span>
            {thread.description && (
              <span className="text-xs text-muted-foreground truncate">{thread.description}</span>
            )}
          </div>
        </div>
      </ExpandableChatHeader>

      <ChatList
        messages={threadMessages}
        conversation={conversationShim}
        isMobile={isMobile}
        typingUsers={typingUsers}
      />

      <ChatBottombar
        conversationId={thread.id}
        isMobile={isMobile}
        typingChannel={typingChannel}
        customSendMessage={customSend}
      />
    </div>
  )
}
