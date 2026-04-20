import { supabase } from '../supabase/client'
import type {
  Thread,
  ThreadFolder,
  ThreadMessage,
  ThreadType,
  ThreadCategory,
} from '@/app/data'
import type { AttachmentData } from './attachments'
import { getAvatarUrl } from '../utils'

export interface CreateThreadParams {
  loomId: string
  name: string
  description?: string
  iconEmoji?: string
  type?: ThreadType
  category?: ThreadCategory
  createdBy: string
  /** Optional folder to create the thread inside */
  folderId?: string | null
}

export async function createThread(params: CreateThreadParams): Promise<Thread | null> {
  const {
    loomId,
    name,
    description,
    iconEmoji,
    type = 'open',
    category = 'text',
    createdBy,
    folderId,
  } = params

  const { data, error } = await supabase
    .from('threads')
    .insert({
      loom_id: loomId,
      name,
      description: description || null,
      icon_emoji: iconEmoji || null,
      type,
      category,
      created_by: createdBy,
      folder_id: folderId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating thread:', error)
    throw new Error(error.message || 'Failed to create Thread')
  }

  return normalizeThreadRow(data as Record<string, unknown>)
}

export async function getThreads(loomId: string): Promise<Thread[]> {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('loom_id', loomId)
    .eq('is_archived', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching threads:', error)
    return []
  }

  return (data || []).map(normalizeThreadRow)
}

function normalizeThreadRow(row: Record<string, unknown>): Thread {
  const t = row as unknown as Thread
  return {
    ...t,
    folder_id: (row.folder_id as string | null | undefined) ?? null,
  }
}

export async function getThreadById(threadId: string): Promise<Thread | null> {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (error) {
    console.error('Error fetching thread:', error)
    return null
  }

  return data ? normalizeThreadRow(data as Record<string, unknown>) : null
}

export async function updateThread(
  threadId: string,
  updates: {
    name?: string
    description?: string
    icon_emoji?: string
    type?: ThreadType
    is_pinned?: boolean
    is_archived?: boolean
    folder_id?: string | null
  },
): Promise<boolean> {
  const { error } = await supabase
    .from('threads')
    .update(updates)
    .eq('id', threadId)

  if (error) {
    console.error('Error updating thread:', error)
    return false
  }

  return true
}

export async function deleteThread(threadId: string): Promise<boolean> {
  const { error } = await supabase
    .from('threads')
    .delete()
    .eq('id', threadId)

  if (error) {
    console.error('Error deleting thread:', error)
    return false
  }

  return true
}

// --- Thread folders (loom sidebar groups) ---

export async function getThreadFolders(loomId: string): Promise<ThreadFolder[]> {
  const { data, error } = await supabase
    .from('thread_folders')
    .select('*')
    .eq('loom_id', loomId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching thread folders:', error)
    return []
  }

  return (data || []) as ThreadFolder[]
}

export async function createThreadFolder(params: {
  loomId: string
  name: string
  createdBy: string
}): Promise<ThreadFolder | null> {
  const { loomId, name, createdBy } = params
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = await getThreadFolders(loomId)
  const position =
    existing.length === 0
      ? 0
      : Math.max(...existing.map((f) => f.position)) + 1

  const { data, error } = await supabase
    .from('thread_folders')
    .insert({
      loom_id: loomId,
      name: trimmed,
      position,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating thread folder:', error)
    return null
  }

  return data as ThreadFolder
}

export async function updateThreadFolder(
  folderId: string,
  updates: { name?: string; position?: number },
): Promise<boolean> {
  const { error } = await supabase
    .from('thread_folders')
    .update(updates)
    .eq('id', folderId)

  if (error) {
    console.error('Error updating thread folder:', error)
    return false
  }

  return true
}

export async function deleteThreadFolder(folderId: string): Promise<boolean> {
  const { error } = await supabase.from('thread_folders').delete().eq('id', folderId)

  if (error) {
    console.error('Error deleting thread folder:', error)
    return false
  }

  return true
}

export function subscribeToThreadFolders(
  loomId: string,
  handlers: {
    onUpsert: (folder: ThreadFolder) => void
    onDelete: (folderId: string) => void
  },
) {
  const channel = supabase
    .channel(`thread_folders:${loomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'thread_folders',
        filter: `loom_id=eq.${loomId}`,
      },
      (payload) => {
        const ev = payload.eventType
        if (ev === 'DELETE') {
          const oldRow = payload.old as { id?: string } | null
          if (oldRow?.id) handlers.onDelete(oldRow.id)
          return
        }
        const row = payload.new as ThreadFolder
        if (row?.id) handlers.onUpsert(row)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// --- Thread Messages ---

export async function getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
  const { data, error } = await supabase
    .from('thread_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching thread messages:', error)
    return []
  }

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

    const likes = Array.isArray(msg.likes) ? msg.likes : []

    return {
      id: msg.id,
      thread_id: msg.thread_id,
      sender_id: msg.sender_id,
      content: msg.content,
      created_at: msg.created_at,
      read_at: msg.read_at,
      reply_to: msg.reply_to || null,
      edited_at: msg.edited_at || null,
      likes,
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
      sender,
    }
  })
}

export async function sendThreadMessage(
  threadId: string,
  content: string,
  senderId: string,
  attachment?: AttachmentData,
  replyToId?: string
): Promise<ThreadMessage | null> {
  const messageData: any = {
    thread_id: threadId,
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
    .from('thread_messages')
    .insert(messageData)
    .select('*')
    .single()

  if (error) {
    console.error('Error sending thread message:', error)
    return null
  }

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

  const likes = Array.isArray(data.likes) ? data.likes : []

  return {
    id: data.id,
    thread_id: data.thread_id,
    sender_id: data.sender_id,
    content: data.content,
    created_at: data.created_at,
    read_at: data.read_at,
    reply_to: data.reply_to || null,
    edited_at: data.edited_at || null,
    likes,
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
    sender: senderData,
  }
}

export async function editThreadMessage(
  messageId: string,
  newContent: string,
  userId: string
): Promise<boolean> {
  const { data: message, error: fetchError } = await supabase
    .from('thread_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single()

  if (fetchError || message?.sender_id !== userId) {
    console.error('Cannot edit this message')
    return false
  }

  const { error } = await supabase
    .from('thread_messages')
    .update({ content: newContent.trim() })
    .eq('id', messageId)
    .eq('sender_id', userId)

  if (error) {
    console.error('Error editing thread message:', error)
    return false
  }

  return true
}

export async function toggleThreadMessageLike(
  messageId: string,
  userId: string
): Promise<boolean> {
  const { data: message, error: fetchError } = await supabase
    .from('thread_messages')
    .select('likes')
    .eq('id', messageId)
    .single()

  if (fetchError) {
    console.error('Error fetching thread message:', fetchError)
    return false
  }

  const likes = Array.isArray(message.likes) ? message.likes : []
  const isLiked = likes.includes(userId)
  const newLikes = isLiked
    ? likes.filter((id: string) => id !== userId)
    : [...likes, userId]

  const { error } = await supabase
    .from('thread_messages')
    .update({ likes: newLikes })
    .eq('id', messageId)

  if (error) {
    console.error('Error toggling thread message like:', error)
    return false
  }

  return true
}

export async function markThreadMessagesAsRead(
  threadId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase.rpc('mark_thread_messages_as_read', {
    p_thread_id: threadId,
    p_user_id: userId,
  })

  if (error) {
    console.error('Error marking thread messages as read:', error)
    return false
  }

  return true
}

export async function getUnreadLoomCounts(
  userId: string,
  loomIds: string[]
): Promise<Record<string, number>> {
  if (loomIds.length === 0) return {}

  const { data, error } = await supabase
    .from('thread_messages')
    .select('threads!inner(loom_id)')
    .in('threads.loom_id', loomIds)
    .is('read_at', null)
    .neq('sender_id', userId)

  if (error) {
    console.error('Error fetching loom unread counts:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  ;(data || []).forEach((row: any) => {
    const loomId = row?.threads?.loom_id
    if (!loomId) return
    counts[loomId] = (counts[loomId] || 0) + 1
  })

  return counts
}

/**
 * Returns the unread count per thread_id for the given user, considering only
 * threads in the provided list. Mirrors `getUnreadLoomCounts` but grouped by
 * thread instead of loom. Uses the same read_at IS NULL + sender != user
 * semantics the rest of the app relies on.
 */
export async function getUnreadThreadCounts(
  userId: string,
  threadIds: string[],
): Promise<Record<string, number>> {
  if (threadIds.length === 0) return {}

  const { data, error } = await supabase
    .from('thread_messages')
    .select('thread_id')
    .in('thread_id', threadIds)
    .is('read_at', null)
    .neq('sender_id', userId)

  if (error) {
    console.error('Error fetching thread unread counts:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  ;(data || []).forEach((row: { thread_id?: string | null }) => {
    const threadId = row?.thread_id
    if (!threadId) return
    counts[threadId] = (counts[threadId] || 0) + 1
  })

  return counts
}

// --- Realtime ---

export function subscribeToThreadMessages(
  threadId: string,
  callback: (message: ThreadMessage) => void
) {
  const channel = supabase
    .channel(`thread-messages:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'thread_messages',
        filter: `thread_id=eq.${threadId}`,
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
          thread_id: msg.thread_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          read_at: msg.read_at,
          reply_to: msg.reply_to || null,
          edited_at: msg.edited_at || null,
          likes: Array.isArray(msg.likes) ? msg.likes : [],
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
        table: 'thread_messages',
        filter: `thread_id=eq.${threadId}`,
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
          thread_id: msg.thread_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
          read_at: msg.read_at,
          reply_to: msg.reply_to || null,
          edited_at: msg.edited_at || null,
          likes: Array.isArray(msg.likes) ? msg.likes : [],
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

export function subscribeToThreads(
  loomId: string,
  handlers: {
    onUpsert: (thread: Thread) => void
    onDelete?: (threadId: string) => void
  },
) {
  const channel = supabase
    .channel(`threads:${loomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'threads',
        filter: `loom_id=eq.${loomId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as { id?: string } | null
          if (oldRow?.id) handlers.onDelete?.(oldRow.id)
          return
        }
        const row = payload.new as Record<string, unknown> | null
        if (row && typeof row.id === 'string') {
          handlers.onUpsert(normalizeThreadRow(row))
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
