import { supabase } from '../supabase/client'
import type { ConversationWithUser, ConversationParticipant } from '@/app/data'
import { getConversations } from './conversations'

export interface CreateGroupParams {
  name: string
  createdBy: string
  participantIds: string[]
}

export interface UserValidationResult {
  userId: string
  canAdd: boolean
  reason?: string
  username?: string
}

export async function validateGroupParticipants(
  createdBy: string,
  participantIds: string[]
): Promise<{ valid: boolean; invalidUsers: UserValidationResult[] }> {
  const invalidUsers: UserValidationResult[] = []
  
  // Get all conversations for the creator
  const conversations = await getConversations(createdBy)
  
  // Get accepted chat requests
  const { data: acceptedRequests } = await supabase
    .from('chat_requests')
    .select('requester_id, recipient_id')
    .or(`requester_id.eq.${createdBy},recipient_id.eq.${createdBy}`)
    .eq('status', 'accepted')
  
  // Create a set of user IDs that have accepted requests or existing conversations
  const validUserIds = new Set<string>()
  
  // Add users from existing conversations
  conversations
    .filter(c => !c.is_group)
    .forEach(c => {
      if (c.user1_id === createdBy) {
        validUserIds.add(c.user2_id)
      } else if (c.user2_id === createdBy) {
        validUserIds.add(c.user1_id)
      }
    })
  
  // Add users from accepted requests
  acceptedRequests?.forEach((req: any) => {
    if (req.requester_id === createdBy) {
      validUserIds.add(req.recipient_id)
    } else if (req.recipient_id === createdBy) {
      validUserIds.add(req.requester_id)
    }
  })
  
  // Validate each participant
  for (const userId of participantIds) {
    if (userId === createdBy) {
      continue // Creator can always be added
    }
    
    if (!validUserIds.has(userId)) {
      // Fetch username for error message
      const { data: user } = await supabase
        .from('users')
        .select('username, fullname')
        .eq('id', userId)
        .single()
      
      invalidUsers.push({
        userId,
        canAdd: false,
        reason: 'has not accepted your chat request',
        username: user?.username || user?.fullname || 'Unknown',
      })
    }
  }
  
  return {
    valid: invalidUsers.length === 0,
    invalidUsers,
  }
}

export async function createGroupConversation(params: CreateGroupParams): Promise<ConversationWithUser | null> {
  const { name, createdBy, participantIds } = params
  
  // Validate participants before creating group
  const validation = await validateGroupParticipants(createdBy, participantIds)
  if (!validation.valid) {
    // Create user-friendly error message
    const usernames = validation.invalidUsers.map(u => u.username || 'this user')
    let errorMessage = ''
    if (validation.invalidUsers.length === 1) {
      errorMessage = `Hey, man! ${usernames[0]} hasn't accepted your initial chat invite!`
    } else {
      errorMessage = `Hey, man! ${usernames.slice(0, -1).join(', ')} and ${usernames[usernames.length - 1]} haven't accepted your initial chat invites!`
    }
    throw new Error(errorMessage)
  }

  // user1_id/user2_id are for 1-on-1 chats; for groups both point to the creator
  // (the partial unique index excludes is_group=true rows from the uniqueness check)
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      is_group: true,
      name: name,
      created_by: createdBy,
      user1_id: createdBy,
      user2_id: createdBy,
    })
    .select()
    .single()

  if (convError) {
    console.error('Error creating group conversation:', convError.message, convError.code, convError.details, convError.hint)
    throw new Error(convError.message || 'Failed to create group conversation')
  }

  // First, add creator as admin (must be first so they can add others)
  const { error: creatorError } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversation.id,
      user_id: createdBy,
      role: 'admin',
    })

  if (creatorError) {
    console.error('Error adding creator:', creatorError.message, creatorError.code)
    await supabase.from('conversations').delete().eq('id', conversation.id)
    throw new Error(creatorError.message || 'Failed to add you as group admin')
  }

  // Then add other participants (now creator is admin and can add them)
  const otherParticipants = participantIds
    .filter(id => id !== createdBy)
    .map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: 'member' as const,
    }))

  if (otherParticipants.length > 0) {
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(otherParticipants)

    if (participantsError) {
      console.error('Error adding participants:', participantsError.message, participantsError.code)
      await supabase.from('conversations').delete().eq('id', conversation.id)
      throw new Error(participantsError.message || 'Failed to add group members')
    }
  }

  // Fetch the complete conversation with participants
  return await getGroupConversationById(conversation.id)
}

export async function getGroupConversationById(conversationId: string): Promise<ConversationWithUser | null> {
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('is_group', true)
    .single()

  if (convError) {
    console.error('Error fetching group conversation:', convError)
    return null
  }

  // Fetch participants with user details
  const { data: participants, error: partError } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId)

  if (partError) {
    console.error('Error fetching participants:', partError)
    return null
  }

  // Fetch user details for all participants
  const userIds = participants.map(p => p.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, username, fullname, avatar_url, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  const participantsWithUsers: ConversationParticipant[] = participants.map((p: any) => ({
    id: p.id,
    conversation_id: p.conversation_id,
    user_id: p.user_id,
    joined_at: p.joined_at,
    role: p.role,
    user: userMap.get(p.user_id) || {
      id: p.user_id,
      username: null,
      fullname: null,
      avatar_url: null,
      email: '',
    },
  }))

  return {
    id: conversation.id,
    created_at: conversation.created_at,
    user1_id: conversation.user1_id,
    user2_id: conversation.user2_id,
    is_group: conversation.is_group,
    name: conversation.name,
    created_by: conversation.created_by,
    icon_name: (conversation as any).icon_name || null,
    last_message: conversation.last_message,
    participants: participantsWithUsers,
    participant_count: participantsWithUsers.length,
  }
}

export async function addParticipantToGroup(
  conversationId: string,
  userId: string,
  addedBy: string
): Promise<boolean> {
  // Check if the user adding is an admin
  const { data: adminCheck } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', addedBy)
    .single()

  if (!adminCheck || adminCheck.role !== 'admin') {
    console.error('Only admins can add participants')
    return false
  }

  const { error } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'member',
    })

  if (error) {
    console.error('Error adding participant:', error)
    return false
  }

  return true
}

export async function removeParticipantFromGroup(
  conversationId: string,
  userId: string,
  removedBy: string
): Promise<boolean> {
  // Check if the user removing is an admin or removing themselves
  if (userId !== removedBy) {
    const { data: adminCheck } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', removedBy)
      .single()

    if (!adminCheck || adminCheck.role !== 'admin') {
      console.error('Only admins can remove participants')
      return false
    }
  }

  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing participant:', error)
    return false
  }

  return true
}

export async function updateParticipantRole(
  conversationId: string,
  userId: string,
  newRole: 'admin' | 'member',
  updatedBy: string
): Promise<boolean> {
  // Check if the user updating is an admin
  const { data: adminCheck } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', updatedBy)
    .single()

  if (!adminCheck || adminCheck.role !== 'admin') {
    console.error('Only admins can update participant roles')
    return false
  }

  const { error } = await supabase
    .from('conversation_participants')
    .update({ role: newRole })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating participant role:', error)
    return false
  }

  return true
}

export async function getGroupParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  const { data: participants, error } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId)

  if (error) {
    console.error('Error fetching participants:', error)
    return []
  }

  // Fetch user details
  const userIds = participants.map(p => p.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, username, fullname, avatar_url, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  return participants.map((p: any) => ({
    id: p.id,
    conversation_id: p.conversation_id,
    user_id: p.user_id,
    joined_at: p.joined_at,
    role: p.role,
    user: userMap.get(p.user_id) || {
      id: p.user_id,
      username: null,
      fullname: null,
      avatar_url: null,
      email: '',
    },
  }))
}

export async function updateGroupName(
  conversationId: string,
  newName: string,
  updatedBy: string,
  iconName?: string
): Promise<boolean> {
  // Check if the user updating is an admin
  const { data: adminCheck } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', updatedBy)
    .single()

  if (!adminCheck || adminCheck.role !== 'admin') {
    console.error('Only admins can update group name')
    return false
  }

  const updateData: { name: string; icon_name?: string } = { name: newName }
  if (iconName !== undefined) {
    updateData.icon_name = iconName
  }

  const { error } = await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversationId)
    .eq('is_group', true)

  if (error) {
    console.error('Error updating group name:', error)
    return false
  }

  return true
}

export function subscribeToGroupParticipants(
  conversationId: string,
  callback: (participant: ConversationParticipant) => void
) {
  const channel = supabase
    .channel(`group-participants:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const participant = payload.new as any
        const { data: user } = await supabase
          .from('users')
          .select('id, username, fullname, avatar_url, email')
          .eq('id', participant.user_id)
          .single()

        callback({
          id: participant.id,
          conversation_id: participant.conversation_id,
          user_id: participant.user_id,
          joined_at: participant.joined_at,
          role: participant.role,
          user: user || {
            id: participant.user_id,
            username: null,
            fullname: null,
            avatar_url: null,
            email: '',
          },
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

