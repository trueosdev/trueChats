"use client"

import { useState, useEffect } from 'react'
import { Search, X, Users, ArrowLeft, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
import { ThemeAvatarImage } from './ui/theme-avatar'
import { getUsers } from '@/lib/services/users'
import { createGroupConversation } from '@/lib/services/groups'
import { getConversations } from '@/lib/services/conversations'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/app/data'
import { supabase } from '@/lib/supabase/client'

interface NewGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupCreated: (conversationId: string) => void
}

interface UserWithStatus extends User {
  canAddToGroup?: boolean
}

export function NewGroupDialog({ open, onOpenChange, onGroupCreated }: NewGroupDialogProps) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserWithStatus[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [groupName, setGroupName] = useState('')
  const [step, setStep] = useState<'select' | 'name'>('select')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && user) {
      setLoading(true)
      Promise.all([
        getUsers(),
        getConversations(user.id),
        supabase
          .from('chat_requests')
          .select('requester_id, recipient_id')
          .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .eq('status', 'accepted')
      ]).then(([usersData, conversations, { data: acceptedRequests }]) => {
        const otherUsers = usersData.filter((u) => u.id !== user.id)
        const validUserIds = new Set<string>()

        conversations
          .filter(c => !c.is_group)
          .forEach(c => {
            if (c.user1_id === user.id) validUserIds.add(c.user2_id)
            else if (c.user2_id === user.id) validUserIds.add(c.user1_id)
          })

        acceptedRequests?.forEach((req: any) => {
          if (req.requester_id === user.id) validUserIds.add(req.recipient_id)
          else if (req.recipient_id === user.id) validUserIds.add(req.requester_id)
        })

        setUsers(otherUsers.map((u) => ({
          ...u,
          canAddToGroup: validUserIds.has(String(u.id)),
        })))
        setLoading(false)
      })
    } else if (!open) {
      setSearchQuery('')
      setSelectedUserIds(new Set())
      setGroupName('')
      setStep('select')
      setError(null)
    }
  }, [open, user?.id])

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase()
    return (
      u.username?.toLowerCase().includes(query) ||
      u.fullname?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    )
  })

  const toggleUserSelection = (userId: string) => {
    const target = users.find(u => String(u.id) === userId)
    if (target && target.canAddToGroup === false) {
      const name = target.fullname || target.username || target.email || 'this user'
      setError(`${name} hasn't accepted your chat request`)
      return
    }
    const next = new Set(selectedUserIds)
    if (next.has(userId)) next.delete(userId)
    else next.add(userId)
    setSelectedUserIds(next)
    setError(null)
  }

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedUserIds.size < 1) return
    setCreating(true)
    setError(null)
    try {
      const group = await createGroupConversation({
        name: groupName.trim(),
        createdBy: String(user.id),
        participantIds: Array.from(selectedUserIds),
      })
      if (group) {
        onGroupCreated(String(group.id))
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create group.')
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <div className="flex flex-col rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#1a1a1a] text-black dark:text-white shadow-xl w-80 max-h-[28rem] overflow-hidden">
      {step === 'select' ? (
        <>
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-black/10 dark:border-white/10">
            <Search className="h-4 w-4 shrink-0 text-black/40 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setError(null) }}
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none border-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:border-none text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Selected count + error */}
          {(selectedUserIds.size > 0 || error) && (
            <div className="px-3 py-1.5 border-b border-black/10 dark:border-white/10">
              {error ? (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              ) : (
                <p className="text-xs text-black/50 dark:text-white/50">{selectedUserIds.size} selected</p>
              )}
            </div>
          )}

          {/* User list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="loader" style={{ width: '24px', height: '24px' }}></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-xs text-black/40 dark:text-white/40">
                {searchQuery ? 'No users found' : 'No users available'}
              </div>
            ) : (
              <div className="py-1">
                {filteredUsers.map((userItem) => {
                  const isSelected = selectedUserIds.has(String(userItem.id))
                  const canAdd = userItem.canAddToGroup !== false
                  return (
                    <button
                      key={userItem.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!canAdd}
                      onClick={() => toggleUserSelection(String(userItem.id))}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9">
                          <ThemeAvatarImage avatarUrl={userItem.avatar_url} alt={userItem.name} />
                        </Avatar>
                        {isSelected && (
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-black dark:bg-white rounded-full flex items-center justify-center">
                            <Check size={10} className="text-white dark:text-black" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {userItem.fullname || userItem.username || userItem.email}
                        </p>
                        {userItem.username && (
                          <p className="text-xs text-black/50 dark:text-white/50 truncate">@{userItem.username}</p>
                        )}
                      </div>
                      {!canAdd && (
                        <span className="text-[10px] text-black/40 dark:text-white/40 shrink-0">No invite</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Next button */}
          <div className="px-3 py-2.5 border-t border-black/10 dark:border-white/10">
            <Button
              onClick={() => { if (selectedUserIds.size >= 1) setStep('name') }}
              disabled={selectedUserIds.size < 1}
              className="w-full h-8 text-sm"
              size="sm"
            >
              Next ({selectedUserIds.size})
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Name step header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-black/10 dark:border-white/10">
            <button onClick={() => setStep('select')} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white">
              <ArrowLeft size={16} />
            </button>
            <span className="text-sm font-medium">Name your group</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

            <input
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => { setGroupName(e.target.value); setError(null) }}
              autoFocus
              className="w-full bg-transparent text-sm outline-none border-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:border-none border-b border-black/10 dark:border-white/10 pb-2 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
            />

            {/* Member preview */}
            <div className="space-y-1">
              <p className="text-xs text-black/50 dark:text-white/50">{selectedUserIds.size + 1} members</p>
              {Array.from(selectedUserIds).map((userId) => {
                const u = users.find(u => String(u.id) === userId)
                if (!u) return null
                return (
                  <div key={userId} className="flex items-center gap-2 py-1">
                    <Avatar className="h-7 w-7">
                      <ThemeAvatarImage avatarUrl={u.avatar_url} alt={u.name} />
                    </Avatar>
                    <span className="text-xs truncate">{u.fullname || u.username || u.email}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Create button */}
          <div className="px-3 py-2.5 border-t border-black/10 dark:border-white/10">
            <Button
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim()}
              className="w-full h-8 text-sm"
              size="sm"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
