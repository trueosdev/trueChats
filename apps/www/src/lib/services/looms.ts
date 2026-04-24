import { supabase } from '../supabase/client'
import type { Loom, LoomInvite, LoomMember, LoomMemberRole, LoomVisibility } from '@/app/data'

export type DeleteLoomErrorCode =
  | 'not_owner'
  | 'rpc_error'
  | 'unknown'

export interface CreateLoomParams {
  name: string
  description?: string
  iconName?: string
  iconUrl?: string
  visibility?: LoomVisibility
  createdBy: string
}

export async function createLoom(params: CreateLoomParams): Promise<Loom | null> {
  const { name, description, iconName, iconUrl, visibility = 'private', createdBy } = params

  // created_by is set by DB default auth.uid() (see supabase/012) so INSERT RETURNING
  // passes RLS and always matches the session. We still need createdBy for loom_members.
  const { data: loom, error: loomError } = await supabase
    .from('looms')
    .insert({
      name,
      description: description || null,
      icon_name: iconName || 'Users',
      icon_url: iconUrl || null,
      visibility,
    })
    .select()
    .single()

  if (loomError) {
    console.error('Error creating loom:', loomError)
    throw new Error(loomError.message || 'Failed to create Loom')
  }

  const { error: memberError } = await supabase
    .from('loom_members')
    .insert({
      loom_id: loom.id,
      user_id: createdBy,
      role: 'owner',
      status: 'active',
    })

  if (memberError) {
    console.error('Error adding owner to loom:', memberError)
    await supabase.from('looms').delete().eq('id', loom.id)
    throw new Error(memberError.message || 'Failed to set you as Loom owner')
  }

  return {
    ...loom,
    member_count: 1,
    thread_count: 0,
  }
}

export async function uploadLoomIcon(userId: string, loomId: string, file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const filePath = `${userId}/loom-icons/${loomId}/icon-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading loom icon:', uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading loom icon:', error)
    return null
  }
}

export async function getLooms(userId: string): Promise<Loom[]> {
  const { data: memberships, error: memError } = await supabase
    .from('loom_members')
    .select('loom_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (memError) {
    console.error('Error fetching loom memberships:', memError)
    return []
  }

  const loomIds = (memberships || []).map(m => m.loom_id)
  if (loomIds.length === 0) return []

  const { data: looms, error: loomError } = await supabase
    .from('looms')
    .select('*')
    .in('id', loomIds)
    .order('created_at', { ascending: false })

  if (loomError) {
    console.error('Error fetching looms:', loomError)
    return []
  }

  const { data: memberCounts } = await supabase
    .from('loom_members')
    .select('loom_id')
    .in('loom_id', loomIds)
    .eq('status', 'active')

  const countMap: Record<string, number> = {}
  memberCounts?.forEach((m: any) => {
    countMap[m.loom_id] = (countMap[m.loom_id] || 0) + 1
  })

  return (looms || []).map((loom: any) => ({
    ...loom,
    member_count: countMap[loom.id] || 0,
  }))
}

export async function getLoomById(loomId: string): Promise<Loom | null> {
  const { data, error } = await supabase
    .from('looms')
    .select('*')
    .eq('id', loomId)
    .single()

  if (error) {
    console.error('Error fetching loom:', error)
    return null
  }

  const { count } = await supabase
    .from('loom_members')
    .select('id', { count: 'exact', head: true })
    .eq('loom_id', loomId)
    .eq('status', 'active')

  return { ...data, member_count: count || 0 }
}

export async function updateLoom(
  loomId: string,
  updates: { name?: string; description?: string; icon_name?: string; icon_url?: string | null; visibility?: LoomVisibility },
  updatedBy: string
): Promise<boolean> {
  const role = await getUserLoomRole(loomId, updatedBy)
  if (!role || !['owner', 'admin'].includes(role)) {
    console.error('Only owners/admins can update a Loom')
    return false
  }

  const { error } = await supabase
    .from('looms')
    .update(updates)
    .eq('id', loomId)

  if (error) {
    console.error('Error updating loom:', error)
    return false
  }

  return true
}

function mapDeleteLoomRpcMessage(msg: string): DeleteLoomErrorCode {
  if (msg.includes('only the active owner')) return 'not_owner'
  return 'rpc_error'
}

export async function deleteLoom(
  loomId: string,
  deletedBy: string
): Promise<{ ok: true } | { ok: false; code: DeleteLoomErrorCode; message?: string }> {
  const role = await getUserLoomRole(loomId, deletedBy)
  if (role !== 'owner') {
    console.error('Only the owner can delete a Loom')
    return { ok: false, code: 'not_owner' }
  }

  const { error } = await supabase.rpc('delete_loom_as_owner', {
    p_loom_id: loomId,
  })

  if (error) {
    console.error('Error deleting loom:', error)
    const code = mapDeleteLoomRpcMessage(error.message || '')
    return {
      ok: false,
      code,
      message: error.message || undefined,
    }
  }

  return { ok: true }
}

export async function transferLoomOwnership(
  loomId: string,
  newOwnerId: string
): Promise<{ ok: true } | { ok: false; message?: string }> {
  const { error } = await supabase.rpc('transfer_loom_ownership', {
    p_loom_id: loomId,
    p_new_owner_id: newOwnerId,
  })

  if (error) {
    console.error('Error transferring loom ownership:', error)
    return { ok: false, message: error.message || 'Transfer failed' }
  }

  return { ok: true }
}

// --- Member management ---

export async function getLoomMembers(loomId: string): Promise<LoomMember[]> {
  const { data: members, error } = await supabase
    .from('loom_members')
    .select('*')
    .eq('loom_id', loomId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching loom members:', error)
    return []
  }

  const userIds = (members || []).map(m => m.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, username, fullname, avatar_url, email')
    .in('id', userIds)

  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  return (members || []).map((m: any) => ({
    id: m.id,
    loom_id: m.loom_id,
    user_id: m.user_id,
    role: m.role,
    status: (m.status ?? 'active') as LoomMember['status'],
    joined_at: m.joined_at,
    invited_by: m.invited_by ?? null,
    invited_at: m.invited_at ?? null,
    user: userMap.get(m.user_id) || {
      id: m.user_id,
      username: null,
      fullname: null,
      avatar_url: null,
      email: '',
    },
  }))
}

export async function addLoomMember(
  loomId: string,
  userId: string,
  addedBy: string,
  role: LoomMemberRole = 'member'
): Promise<boolean> {
  const adderRole = await getUserLoomRole(loomId, addedBy)
  if (!adderRole || !['owner', 'admin'].includes(adderRole)) {
    console.error('Only owners/admins can add members')
    return false
  }

  // New members are invited, not immediately active. They must accept from
  // their pending chats inbox to actually join.
  const { error } = await supabase
    .from('loom_members')
    .insert({
      loom_id: loomId,
      user_id: userId,
      role,
      status: 'invited',
      invited_by: addedBy,
      invited_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Error adding loom member:', error)
    return false
  }

  return true
}

export async function removeLoomMember(
  loomId: string,
  userId: string,
  removedBy: string
): Promise<boolean> {
  if (userId !== removedBy) {
    const removerRole = await getUserLoomRole(loomId, removedBy)
    if (!removerRole || !['owner', 'admin'].includes(removerRole)) {
      console.error('Only owners/admins can remove members')
      return false
    }
  }

  const { error } = await supabase
    .from('loom_members')
    .delete()
    .eq('loom_id', loomId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing loom member:', error)
    return false
  }

  return true
}

export async function leaveLoom(
  loomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; code: 'owner_must_transfer' | 'failed'; message?: string }> {
  const role = await getUserLoomRole(loomId, userId)
  if (role === 'owner') {
    return {
      ok: false,
      code: 'owner_must_transfer',
      message: 'Transfer ownership before leaving this loom.',
    }
  }

  const ok = await removeLoomMember(loomId, userId, userId)
  if (!ok) {
    return {
      ok: false,
      code: 'failed',
      message: 'Could not leave this loom. Please try again.',
    }
  }

  return { ok: true }
}

export async function updateLoomMemberRole(
  loomId: string,
  userId: string,
  newRole: LoomMemberRole,
  updatedBy: string
): Promise<boolean> {
  const updaterRole = await getUserLoomRole(loomId, updatedBy)
  if (!updaterRole || !['owner', 'admin'].includes(updaterRole)) {
    console.error('Only owners/admins can update roles')
    return false
  }

  const { error } = await supabase
    .from('loom_members')
    .update({ role: newRole })
    .eq('loom_id', loomId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating member role:', error)
    return false
  }

  return true
}

export async function getUserLoomRole(loomId: string, userId: string): Promise<LoomMemberRole | null> {
  const { data, error } = await supabase
    .from('loom_members')
    .select('role')
    .eq('loom_id', loomId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return data.role as LoomMemberRole
}

// --- Realtime ---

export function subscribeToLooms(
  userId: string,
  callback: (loom: Loom) => void
) {
  const channel = supabase
    .channel('looms-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'looms',
      },
      async (payload) => {
        const loom = payload.new as any
        if (!loom.id) return

        const isMember = await supabase
          .from('loom_members')
          .select('id')
          .eq('loom_id', loom.id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()

        if (isMember.data) {
          const { count } = await supabase
            .from('loom_members')
            .select('id', { count: 'exact', head: true })
            .eq('loom_id', loom.id)
            .eq('status', 'active')

          callback({ ...loom, member_count: count || 0 })
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToLoomMembers(
  loomId: string,
  callback: () => void
) {
  const channel = supabase
    .channel(`loom-members:${loomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'loom_members',
        filter: `loom_id=eq.${loomId}`,
      },
      () => {
        callback()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// --- Invites ---

export async function getLoomInvites(userId: string): Promise<LoomInvite[]> {
  const { data: invites, error } = await supabase
    .from('loom_members')
    .select('id, loom_id, user_id, invited_by, invited_at')
    .eq('user_id', userId)
    .eq('status', 'invited')
    .order('invited_at', { ascending: false })

  if (error) {
    console.error('Error fetching loom invites:', error)
    return []
  }

  if (!invites || invites.length === 0) return []

  const loomIds = invites.map((i: any) => i.loom_id)
  const inviterIds = Array.from(
    new Set(invites.map((i: any) => i.invited_by).filter(Boolean))
  ) as string[]

  const [loomsRes, invitersRes] = await Promise.all([
    supabase
      .from('looms')
      .select('id, name, description, icon_name, icon_url, visibility')
      .in('id', loomIds),
    inviterIds.length > 0
      ? supabase
          .from('users')
          .select('id, username, fullname, avatar_url, email')
          .in('id', inviterIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const loomMap = new Map((loomsRes.data || []).map((l: any) => [l.id, l]))
  const inviterMap = new Map(
    ((invitersRes as any).data || []).map((u: any) => [u.id, u])
  )

  return invites
    .map((inv: any) => {
      const loom = loomMap.get(inv.loom_id)
      if (!loom) return null
      return {
        id: inv.id,
        loom_id: inv.loom_id,
        user_id: inv.user_id,
        invited_by: inv.invited_by ?? null,
        invited_at: inv.invited_at ?? null,
        loom,
        inviter: inv.invited_by ? inviterMap.get(inv.invited_by) ?? null : null,
      } as LoomInvite
    })
    .filter((x): x is LoomInvite => x !== null)
}

export async function acceptLoomInvite(
  loomId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('loom_members')
    .update({ status: 'active', joined_at: new Date().toISOString() })
    .eq('loom_id', loomId)
    .eq('user_id', userId)
    .eq('status', 'invited')

  if (error) {
    console.error('Error accepting loom invite:', error)
    return false
  }

  return true
}

export async function denyLoomInvite(
  loomId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('loom_members')
    .delete()
    .eq('loom_id', loomId)
    .eq('user_id', userId)
    .eq('status', 'invited')

  if (error) {
    console.error('Error denying loom invite:', error)
    return false
  }

  return true
}

export function subscribeToLoomInvites(
  userId: string,
  callback: () => void
) {
  // Use a unique channel key per subscriber so multiple components (e.g.
  // chat-layout + pending-chats-page) can both subscribe without Supabase
  // throwing "cannot add postgres_changes callbacks ... after subscribe()".
  const channelKey = `loom-invites:${userId}:${Math.random().toString(36).slice(2)}`
  const channel = supabase
    .channel(channelKey)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'loom_members',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        callback()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
