import { supabase } from '../supabase/client'
import type { Message } from '@/app/data'
import type { AttachmentData } from './attachments'
import { getAvatarUrl } from '../utils'

export interface MessageWithUser extends Message {
  id: string
  sender_id: string
  conversation_id: string
  content: string
  created_at: string
  read_at?: string | null
  reply_to?: string | null
  edited_at?: string | null
  likes?: string[]
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
  sender: {
    id: string
    username: string | null
    fullname: string | null
    avatar_url: string | null
  }
}

export async function getMessages(conversationId: string): Promise<MessageWithUser[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  // Fetch sender details for all unique sender IDs
  const senderIds = new Set((data || []).map((msg: any) => msg.sender_id))
  const { data: senders } = await supabase
    .from('users')
    .select('id, username, fullname, avatar_url')
    .in('id', Array.from(senderIds))

  const senderMap = new Map((senders || []).map((s: any) => [s.id, s]))

  return (data || []).map((msg: any) => {
    const sender = senderMap.get(msg.sender_id) || {
      id: msg.sender_id,
      username: null,
      fullname: null,
      avatar_url: null,
    }

    // Parse likes array from JSONB
    const likes = Array.isArray(msg.likes) ? msg.likes : (msg.likes ? JSON.parse(JSON.stringify(msg.likes)) : [])

    return {
      id: msg.id,
      sender_id: msg.sender_id,
      conversation_id: msg.conversation_id,
      content: msg.content,
      created_at: msg.created_at,
      read_at: msg.read_at,
      reply_to: msg.reply_to || null,
      edited_at: msg.edited_at || null,
      likes: likes,
      attachment_url: msg.attachment_url,
      attachment_type: msg.attachment_type,
      attachment_name: msg.attachment_name,
      attachment_size: msg.attachment_size,
      message: msg.content,
      timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      name: sender.fullname || sender.username || 'Unknown',
      avatar: getAvatarUrl(sender.avatar_url),
      sender: {
        id: sender.id,
        username: sender.username,
        fullname: sender.fullname,
        avatar_url: sender.avatar_url,
      },
    }
  })
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderId: string,
  attachment?: AttachmentData,
  replyToId?: string
): Promise<MessageWithUser | null> {
  const messageData: any = {
    conversation_id: conversationId,
    content: content.trim(),
    sender_id: senderId,
  }

  if (attachment) {
    messageData.attachment_url = attachment.url
    messageData.attachment_type = attachment.type
    messageData.attachment_name = attachment.name
    messageData.attachment_size = attachment.size
  }

  if (replyToId) {
    messageData.reply_to = replyToId
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select('*')
    .single()

  if (error) {
    console.error('Error sending message:', error)
    return null
  }

  // Fetch sender details
  const { data: sender } = await supabase
    .from('users')
    .select('id, username, fullname, avatar_url')
    .eq('id', senderId)
    .single()

  const senderData = sender || {
    id: senderId,
    username: null,
    fullname: null,
    avatar_url: null,
  }

  const likes = Array.isArray(data.likes) ? data.likes : (data.likes ? JSON.parse(JSON.stringify(data.likes)) : [])

  return {
    id: data.id,
    sender_id: data.sender_id,
    conversation_id: data.conversation_id,
    content: data.content,
    created_at: data.created_at,
    read_at: data.read_at,
    reply_to: data.reply_to || null,
    edited_at: data.edited_at || null,
    likes: likes,
    attachment_url: data.attachment_url,
    attachment_type: data.attachment_type,
    attachment_name: data.attachment_name,
    attachment_size: data.attachment_size,
    message: data.content,
    timestamp: new Date(data.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    name: senderData.fullname || senderData.username || 'Unknown',
    avatar: getAvatarUrl(senderData.avatar_url),
    sender: {
      id: senderData.id,
      username: senderData.username,
      fullname: senderData.fullname,
      avatar_url: senderData.avatar_url,
    },
  }
}

export type SubscribeToMessagesOptions = {
  /**
   * Supabase reuses channels by name; registering `.on()` after `subscribe()` throws.
   * Use a unique scope when more than one subscription exists for the same conversation
   * (e.g. layout unread badges vs. open chat pane).
   */
  channelScope?: string;
};

export function subscribeToMessages(
  conversationId: string,
  callback: (message: MessageWithUser) => void,
  options?: SubscribeToMessagesOptions,
) {
  const scope = options?.channelScope ?? "default";
  const channel = supabase
    .channel(`messages:${conversationId}:${scope}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const msg = payload.new as any
        const { data: sender } = await supabase
          .from('users')
          .select('id, username, fullname, avatar_url')
          .eq('id', msg.sender_id)
          .single()

        callback({
          id: msg.id,
          sender_id: msg.sender_id,
          conversation_id: msg.conversation_id,
          content: msg.content,
          created_at: msg.created_at,
          read_at: msg.read_at,
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          attachment_name: msg.attachment_name,
          attachment_size: msg.attachment_size,
          message: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          name: sender?.fullname || sender?.username || 'Unknown',
          avatar: getAvatarUrl(sender?.avatar_url),
          sender: {
            id: sender?.id || msg.sender_id,
            username: sender?.username || null,
            fullname: sender?.fullname || null,
            avatar_url: sender?.avatar_url || null,
          },
        })
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const msg = payload.new as any
        const { data: sender } = await supabase
          .from('users')
          .select('id, username, fullname, avatar_url')
          .eq('id', msg.sender_id)
          .single()

        const likes = Array.isArray(msg.likes) ? msg.likes : (msg.likes ? JSON.parse(JSON.stringify(msg.likes)) : [])

        callback({
          id: msg.id,
          sender_id: msg.sender_id,
          conversation_id: msg.conversation_id,
          content: msg.content,
          created_at: msg.created_at,
          read_at: msg.read_at,
          reply_to: msg.reply_to || null,
          edited_at: msg.edited_at || null,
          likes: likes,
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          attachment_name: msg.attachment_name,
          attachment_size: msg.attachment_size,
          message: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          name: sender?.fullname || sender?.username || 'Unknown',
          avatar: getAvatarUrl(sender?.avatar_url),
          sender: {
            id: sender?.id || msg.sender_id,
            username: sender?.username || null,
            fullname: sender?.fullname || null,
            avatar_url: sender?.avatar_url || null,
          },
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('mark_messages_as_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    })

    if (error) {
      console.error('Error marking messages as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return false
  }
}

export async function getUnreadMessageCount(
  conversationId: string,
  userId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null)

    if (error) {
      console.error('Error getting unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

export async function getUnreadCounts(
  userId: string,
  conversationIds: string[]
): Promise<Record<string, number>> {
  try {
    if (!userId || conversationIds.length === 0) return {}

    const validIds = conversationIds.filter(Boolean)
    if (validIds.length === 0) return {}

    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', validIds)
      .neq('sender_id', userId)
      .is('read_at', null)

    if (error) {
      console.error('Error getting unread counts:', error.message, error.code, error.details)
      return {}
    }

    const counts: Record<string, number> = {}
    data?.forEach((msg: any) => {
      counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1
    })

    return counts
  } catch (error) {
    console.error('Error getting unread counts:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

export async function toggleMessageLike(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
    // Get current message to check likes
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('likes')
      .eq('id', messageId)
      .single()

    if (fetchError) {
      console.error('Error fetching message:', fetchError)
      return false
    }

    // Parse likes array
    const likes = Array.isArray(message.likes) 
      ? message.likes 
      : (message.likes ? JSON.parse(JSON.stringify(message.likes)) : [])

    // Toggle like
    const userIdStr = userId
    const isLiked = likes.includes(userIdStr)
    const newLikes = isLiked
      ? likes.filter((id: string) => id !== userIdStr)
      : [...likes, userIdStr]

    // Update message
    const { error: updateError } = await supabase
      .from('messages')
      .update({ likes: newLikes })
      .eq('id', messageId)

    if (updateError) {
      console.error('Error toggling like:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error toggling like:', error)
    return false
  }
}

export async function replyToMessage(
  conversationId: string,
  content: string,
  senderId: string,
  replyToId: string,
  attachment?: AttachmentData
): Promise<MessageWithUser | null> {
  return sendMessage(conversationId, content, senderId, attachment, replyToId)
}

export async function editMessage(
  messageId: string,
  newContent: string,
  userId: string
): Promise<boolean> {
  try {
    // First verify the user owns this message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single()

    if (fetchError) {
      console.error('Error fetching message:', fetchError)
      return false
    }

    if (message.sender_id !== userId) {
      console.error('User does not own this message')
      return false
    }

    // Update message content (edited_at will be set by trigger)
    const { error: updateError } = await supabase
      .from('messages')
      .update({ content: newContent.trim() })
      .eq('id', messageId)
      .eq('sender_id', userId)

    if (updateError) {
      console.error('Error editing message:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error editing message:', error)
    return false
  }
}

