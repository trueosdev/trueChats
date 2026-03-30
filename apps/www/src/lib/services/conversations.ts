import { supabase } from '../supabase/client'
import type { Conversation } from '@/lib/types/supabase'
import type { ConversationWithUser } from '@/app/data'

export async function getConversations(userId: string): Promise<ConversationWithUser[]> {
  // Get 1-on-1 conversations
  const { data: directConvs, error: directError } = await supabase
    .from('conversations')
    .select('*')
    .eq('is_group', false)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (directError) {
    console.error('Error fetching direct conversations:', directError)
  }

  // Get group conversations via participants
  const { data: groupParticipants, error: groupError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)

  if (groupError) {
    console.error('Error fetching group participants:', groupError)
  }

  const groupConvIds = (groupParticipants || []).map(p => p.conversation_id)
  let groupConvs: any[] = []
  
  if (groupConvIds.length > 0) {
    const { data, error: groupConvsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('is_group', true)
      .in('id', groupConvIds)
      .order('created_at', { ascending: false })

    if (groupConvsError) {
      console.error('Error fetching group conversations:', groupConvsError)
    } else {
      groupConvs = data || []
    }
  }

  const allConvs = [...(directConvs || []), ...groupConvs]

  // Fetch user details for 1-on-1 chats
  const userIds = new Set<string>()
  directConvs?.forEach((conv: any) => {
    userIds.add(conv.user1_id)
    userIds.add(conv.user2_id)
  })

  const { data: users } = await supabase
    .from('users')
    .select('id, username, fullname, avatar_url, email')
    .in('id', Array.from(userIds))

  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  // For group chats, fetch participants
  const groupConvIdsForParticipants = groupConvs.map(c => c.id)
  let allParticipants: any[] = []
  
  if (groupConvIdsForParticipants.length > 0) {
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('*')
      .in('conversation_id', groupConvIdsForParticipants)

    allParticipants = participants || []

    // Fetch user details for participants
    const participantUserIds = new Set(allParticipants.map(p => p.user_id))
    const { data: participantUsers } = await supabase
      .from('users')
      .select('id, username, fullname, avatar_url, email')
      .in('id', Array.from(participantUserIds))

    const participantUserMap = new Map((participantUsers || []).map((u: any) => [u.id, u]))
    
    allParticipants = allParticipants.map(p => ({
      ...p,
      user: participantUserMap.get(p.user_id) || {
        id: p.user_id,
        username: null,
        fullname: null,
        avatar_url: null,
        email: '',
      },
    }))
  }

  const mapped = allConvs.map((conv: any) => {
    if (conv.is_group) {
      const participants = allParticipants.filter(p => p.conversation_id === conv.id)
      return {
        id: conv.id,
        created_at: conv.created_at,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id,
        is_group: conv.is_group,
        name: conv.name,
        created_by: conv.created_by,
        icon_name: conv.icon_name || null,
        last_message: conv.last_message,
        participants: participants,
        participant_count: participants.length,
      }
    } else {
      // 1-on-1 conversation
      const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id
      const otherUser = userMap.get(otherUserId) || {
        id: otherUserId,
        username: null,
        fullname: null,
        avatar_url: null,
        email: '',
      }

      return {
        id: conv.id,
        created_at: conv.created_at,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id,
        is_group: conv.is_group,
        name: conv.name,
        created_by: conv.created_by,
        icon_name: (conv as any).icon_name || null,
        last_message: conv.last_message,
        other_user: {
          id: otherUser.id,
          username: otherUser.username,
          fullname: otherUser.fullname,
          avatar_url: otherUser.avatar_url,
          email: otherUser.email,
        },
      }
    }
  })

  mapped.sort((a, b) => {
    const aTime = a.last_message?.created_at ?? a.created_at
    const bTime = b.last_message?.created_at ?? b.created_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })

  return mapped
}

export async function createConversation(user1Id: string, user2Id: string): Promise<Conversation | null> {
  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('is_group', false)
    .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
    .single()

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user1_id: user1Id,
      user2_id: user2Id,
      is_group: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating conversation:', error)
    return null
  }

  return data
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching conversation:', error)
    return null
  }

  return data
}

export function subscribeToConversations(
  userId: string,
  callback: (conversation: ConversationWithUser) => void
) {
  const channel = supabase
    .channel('conversations-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `user1_id=eq.${userId}`,
      },
      async (payload) => {
        const conv = payload.new as any
        
        if (conv.is_group) {
          // For group chats, fetch participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', conv.id)

          const userIds = (participants || []).map(p => p.user_id)
          const { data: users } = await supabase
            .from('users')
            .select('id, username, fullname, avatar_url, email')
            .in('id', userIds)

          const userMap = new Map((users || []).map((u: any) => [u.id, u]))

          callback({
            id: conv.id,
            created_at: conv.created_at,
            user1_id: conv.user1_id,
            user2_id: conv.user2_id,
            is_group: conv.is_group,
            name: conv.name,
            created_by: conv.created_by,
            icon_name: conv.icon_name || null,
            last_message: conv.last_message,
            participants: (participants || []).map((p: any) => ({
              ...p,
              user: userMap.get(p.user_id) || {
                id: p.user_id,
                username: null,
                fullname: null,
                avatar_url: null,
                email: '',
              },
            })),
            participant_count: (participants || []).length,
          })
        } else {
          // For 1-on-1 chats
          const { data: user2 } = await supabase
            .from('users')
            .select('id, username, fullname, avatar_url, email')
            .eq('id', conv.user2_id)
            .single()

          callback({
            id: conv.id,
            created_at: conv.created_at,
            user1_id: conv.user1_id,
            user2_id: conv.user2_id,
            is_group: conv.is_group,
            name: conv.name,
            created_by: conv.created_by,
            last_message: conv.last_message,
            other_user: user2 || {
              id: conv.user2_id,
              username: null,
              fullname: null,
              avatar_url: null,
              email: '',
            },
          })
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `user2_id=eq.${userId}`,
      },
      async (payload) => {
        const conv = payload.new as any
        
        if (conv.is_group) {
          // For group chats, fetch participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', conv.id)

          const userIds = (participants || []).map(p => p.user_id)
          const { data: users } = await supabase
            .from('users')
            .select('id, username, fullname, avatar_url, email')
            .in('id', userIds)

          const userMap = new Map((users || []).map((u: any) => [u.id, u]))

          callback({
            id: conv.id,
            created_at: conv.created_at,
            user1_id: conv.user1_id,
            user2_id: conv.user2_id,
            is_group: conv.is_group,
            name: conv.name,
            created_by: conv.created_by,
            icon_name: conv.icon_name || null,
            last_message: conv.last_message,
            participants: (participants || []).map((p: any) => ({
              ...p,
              user: userMap.get(p.user_id) || {
                id: p.user_id,
                username: null,
                fullname: null,
                avatar_url: null,
                email: '',
              },
            })),
            participant_count: (participants || []).length,
          })
        } else {
          // For 1-on-1 chats
          const { data: user1 } = await supabase
            .from('users')
            .select('id, username, fullname, avatar_url, email')
            .eq('id', conv.user1_id)
            .single()

          callback({
            id: conv.id,
            created_at: conv.created_at,
            user1_id: conv.user1_id,
            user2_id: conv.user2_id,
            is_group: conv.is_group,
            name: conv.name,
            created_by: conv.created_by,
            last_message: conv.last_message,
            other_user: user1 || {
              id: conv.user1_id,
              username: null,
              fullname: null,
              avatar_url: null,
              email: '',
            },
          })
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

