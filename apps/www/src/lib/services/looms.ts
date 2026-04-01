import { supabase } from '../supabase/client'
import type { Loom, LoomMember, LoomMemberRole, LoomVisibility } from '@/app/data'

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

export async function deleteLoom(loomId: string, deletedBy: string): Promise<boolean> {
  const role = await getUserLoomRole(loomId, deletedBy)
  if (role !== 'owner') {
    console.error('Only the owner can delete a Loom')
    return false
  }

  const { error } = await supabase
    .from('looms')
    .delete()
    .eq('id', loomId)

  if (error) {
    console.error('Error deleting loom:', error)
    return false
  }

  return true
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
    joined_at: m.joined_at,
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

  const { error } = await supabase
    .from('loom_members')
    .insert({ loom_id: loomId, user_id: userId, role })

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
          .single()

        if (isMember.data) {
          const { count } = await supabase
            .from('loom_members')
            .select('id', { count: 'exact', head: true })
            .eq('loom_id', loom.id)

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
