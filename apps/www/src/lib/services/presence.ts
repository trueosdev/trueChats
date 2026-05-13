import { supabase } from '../supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

const logPresenceDebug =
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEBUG_PRESENCE === '1'

export interface UserPresence {
  user_id: string
  online_at: string
  username?: string
  fullname?: string
  avatar_url?: string
}

export interface TypingState {
  user_id: string
  conversation_id: string
  username?: string
  typing: boolean
}

// Subscribe to presence - tracks your own presence and listens to others
export function subscribeToPresence(
  currentUserId: string,
  callback: (presences: Record<string, UserPresence[]>) => void
): RealtimeChannel {
  const channel = supabase.channel('online-users', {
    config: {
      presence: {
        key: currentUserId,
      },
    },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState() as Record<string, UserPresence[]>
      if (logPresenceDebug) {
        // eslint-disable-next-line no-console
        console.log('👥 Presence updated:', presenceState)
        // eslint-disable-next-line no-console
        console.log('👥 Online users count:', Object.keys(presenceState).length)
      }
      callback(presenceState)
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (logPresenceDebug) {
        // eslint-disable-next-line no-console
        console.log('✅ User joined:', key, newPresences)
      }
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (logPresenceDebug) {
        // eslint-disable-next-line no-console
        console.log('❌ User left:', key, leftPresences)
      }
    })
    .subscribe(async (status) => {
      if (logPresenceDebug) {
        // eslint-disable-next-line no-console
        console.log('🟢 Presence channel status:', status)
      }
      if (status === 'SUBSCRIBED') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const presenceData = {
            user_id: currentUserId,
            online_at: new Date().toISOString(),
            username: user.user_metadata?.username,
            fullname: user.user_metadata?.fullname,
            avatar_url: user.user_metadata?.avatar_url,
          }
          if (logPresenceDebug) {
            // eslint-disable-next-line no-console
            console.log('📡 Broadcasting presence:', presenceData)
          }
          await channel.track(presenceData)
        }
      }
    })

  return channel
}

export function subscribeToTypingIndicator(
  conversationId: string,
  currentUserId: string,
  callback: (typingUsers: TypingState[]) => void
): RealtimeChannel {
  const channel = supabase.channel(`typing:${conversationId}`, {
    config: {
      presence: {
        key: currentUserId,
      },
    },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState() as Record<string, TypingState[]>
      const typingUsers: TypingState[] = []
      
      Object.keys(presenceState).forEach((key) => {
        const presences = presenceState[key]
        presences.forEach((presence) => {
          // Don't include current user
          if (presence.user_id !== currentUserId && presence.typing) {
            typingUsers.push(presence)
          }
        })
      })
      
      callback(typingUsers)
    })
    .subscribe()

  return channel
}

export async function broadcastTyping(
  channel: RealtimeChannel,
  userId: string,
  conversationId: string,
  typing: boolean,
  username?: string
) {
  await channel.track({
    user_id: userId,
    conversation_id: conversationId,
    username: username || 'User',
    typing,
  })
}

export function unsubscribeFromPresence(channel: RealtimeChannel) {
  supabase.removeChannel(channel)
}

