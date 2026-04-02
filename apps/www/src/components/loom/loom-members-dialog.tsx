"use client"

import { useState, useEffect } from 'react'
import { X, UserPlus, MoreVertical, Shield, UserMinus, Search, Crown, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/button'
import { Avatar } from '../ui/avatar'
import { ThemeAvatarImage } from '../ui/theme-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { getLoomMembers, addLoomMember, removeLoomMember, updateLoomMemberRole } from '@/lib/services/looms'
import { getUsers } from '@/lib/services/users'
import { useAuth } from '@/hooks/useAuth'
import type { LoomMember, LoomMemberRole } from '@/app/data'
import type { User } from '@/app/data'

interface LoomMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loomId: string
  loomName: string
}

const ROLE_LABELS: Record<LoomMemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
}

const ROLE_ICONS: Record<LoomMemberRole, typeof Crown> = {
  owner: Crown,
  admin: ShieldCheck,
  moderator: Shield,
  member: Shield,
}

export function LoomMembersDialog({ open, onOpenChange, loomId, loomName }: LoomMembersDialogProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<LoomMember[]>([])
  const [loading, setLoading] = useState(false)
  const [actioningMemberId, setActioningMemberId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const currentMember = members.find(m => String(m.user_id) === String(user?.id))
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  useEffect(() => {
    if (open) loadMembers()
  }, [open, loomId])

  const loadMembers = async () => {
    setLoading(true)
    const data = await getLoomMembers(loomId)
    setMembers(data)
    setLoading(false)
  }

  const loadAvailableUsers = async () => {
    const allUsers = await getUsers()
    const memberIds = new Set(members.map(m => m.user_id))
    setAvailableUsers(allUsers.filter(u => !memberIds.has(String(u.id)) && String(u.id) !== user?.id))
  }

  const handleAddMember = async (userId: string) => {
    if (!user) return
    setAdding(true)
    setActionError(null)
    const success = await addLoomMember(loomId, userId, String(user.id))
    if (success) {
      await loadMembers()
      setShowAddMember(false)
      setSearchQuery('')
    } else {
      setActionError('Could not add member. Please try again.')
    }
    setAdding(false)
  }

  const handleRemoveMember = async (userId: string) => {
    if (!user) return
    setActionError(null)
    setActioningMemberId(userId)
    const success = await removeLoomMember(loomId, userId, String(user.id))
    if (success) {
      await loadMembers()
    } else {
      setActionError('Could not remove member. Check your permissions and try again.')
    }
    setActioningMemberId(null)
  }

  const handleRoleChange = async (userId: string, newRole: LoomMemberRole) => {
    if (!user) return
    setActionError(null)
    setActioningMemberId(userId)
    const success = await updateLoomMemberRole(loomId, userId, newRole, String(user.id))
    if (success) {
      await loadMembers()
    } else {
      setActionError(`Could not update role to ${ROLE_LABELS[newRole]}. Please try again.`)
    }
    setActioningMemberId(null)
  }

  const filteredUsers = availableUsers.filter((u) => {
    const query = searchQuery.toLowerCase()
    return (
      u.username?.toLowerCase().includes(query) ||
      u.fullname?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    )
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-white/10">
      <div className="bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-none">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">
              {showAddMember ? 'Add Member' : 'Members'}
            </h2>
            {!showAddMember && (
              <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">{loomName} · {members.length} members</p>
            )}
          </div>
          <button
            onClick={() => {
              if (showAddMember) { setShowAddMember(false); setSearchQuery('') }
              else onOpenChange(false)
            }}
            className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {showAddMember ? (
          <>
            <div className="px-4 py-3 border-none">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg text-sm outline-none border-none text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-black/40 dark:text-white/40">
                  {searchQuery ? 'No users found' : 'No users available'}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleAddMember(String(u.id))}
                      disabled={adding}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      <Avatar className="h-9 w-9">
                        <ThemeAvatarImage avatarUrl={u.avatar_url} alt={u.name} />
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-black dark:text-white truncate">
                          {u.fullname || u.username || u.email}
                        </p>
                        {u.username && <p className="text-xs text-black/50 dark:text-white/50 truncate">@{u.username}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {canManage && (
              <div className="px-3 py-2 border-none">
                <Button
                  onClick={() => { setShowAddMember(true); loadAvailableUsers() }}
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm"
                  size="sm"
                >
                  <UserPlus size={15} />
                  Add Member
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
              {actionError && (
                <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-300">
                  {actionError}
                </p>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loader" style={{ width: '24px', height: '24px' }}></div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {members.map((member) => {
                    const isCurrentUser = String(member.user_id) === String(user?.id)
                    const isActingOnMember = actioningMemberId === member.user_id
                    const RoleIcon = ROLE_ICONS[member.role]
                    return (
                      <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                        <Avatar className="h-9 w-9">
                          <ThemeAvatarImage
                            avatarUrl={member.user.avatar_url}
                            alt={member.user.fullname || member.user.username || ''}
                          />
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-black dark:text-white truncate">
                              {member.user.fullname || member.user.username || member.user.email}
                              {isCurrentUser && <span className="text-black/40 dark:text-white/40"> (You)</span>}
                            </p>
                            {member.role !== 'member' && (
                              <RoleIcon size={13} className="text-black/50 dark:text-white/50 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-black/40 dark:text-white/40">{ROLE_LABELS[member.role]}</p>
                        </div>

                        {canManage && !isCurrentUser && member.role !== 'owner' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isActingOnMember}>
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.role !== 'admin' && (
                                <DropdownMenuItem disabled={isActingOnMember} onSelect={() => handleRoleChange(member.user_id, 'admin')}>
                                  <ShieldCheck size={14} className="mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              {member.role !== 'moderator' && (
                                <DropdownMenuItem disabled={isActingOnMember} onSelect={() => handleRoleChange(member.user_id, 'moderator')}>
                                  <Shield size={14} className="mr-2" />
                                  Make Moderator
                                </DropdownMenuItem>
                              )}
                              {member.role !== 'member' && (
                                <DropdownMenuItem disabled={isActingOnMember} onSelect={() => handleRoleChange(member.user_id, 'member')}>
                                  Demote to Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                disabled={isActingOnMember}
                                onSelect={() => handleRemoveMember(member.user_id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <UserMinus size={14} className="mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
