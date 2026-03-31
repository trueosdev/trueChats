"use client"

import { useState, useEffect } from 'react'
import { Search, X, MessageSquare, Mailbox } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
import { ThemeAvatarImage } from './ui/theme-avatar'
import { getUsers } from '@/lib/services/users'
import { createConversation, getConversations } from '@/lib/services/conversations'
import { createChatRequest, canSendRequest, getCooldownRemaining, type ChatRequest } from '@/lib/services/chat-requests'
import { useAuth } from '@/hooks/useAuth'
import { useColorTheme } from '@/hooks/useColorTheme'
import type { User } from '@/app/data'
import { supabase } from '@/lib/supabase/client'

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationCreated: (conversationId: string) => void
}

interface UserWithStatus extends User {
  hasConversation?: boolean
  canRequest?: boolean
  cooldownHours?: number | null
  existingConversationId?: string | null
}

export function NewChatDialog({ open, onOpenChange, onConversationCreated }: NewChatDialogProps) {
  const { user } = useAuth()
  const { colorTheme } = useColorTheme()
  const isBlackWhite = colorTheme.name === "Black & White"
  const [users, setUsers] = useState<UserWithStatus[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)
  const [requesting, setRequesting] = useState<string | null>(null)

  useEffect(() => {
    if (open && user) {
      setLoading(true)
      Promise.all([
        getUsers(),
        getConversations(user.id)
      ]).then(([usersData, conversations]) => {
        const otherUsers = usersData.filter((u) => u.id !== user.id)
        
        const usersWithStatus = otherUsers.map((u) => {
          const existingConv = conversations.find(
            (c) => !c.is_group && 
            (c.user1_id === String(user.id) && c.user2_id === String(u.id) || 
             c.user1_id === String(u.id) && c.user2_id === String(user.id))
          )
          
          return {
            ...u,
            hasConversation: !!existingConv,
            existingConversationId: existingConv?.id || null,
          }
        })
        
        Promise.all(
          usersWithStatus
            .filter((u) => !u.hasConversation)
            .map(async (u) => {
              const canRequest = await canSendRequest(String(user.id), String(u.id))
              let cooldownHours: number | null = null
              
              if (!canRequest) {
                cooldownHours = await getCooldownRemaining(String(user.id), String(u.id))
              }
              
              return {
                ...u,
                canRequest,
                cooldownHours,
              }
            })
        ).then((updatedUsers) => {
          const usersWithConversations = usersWithStatus.filter((u) => u.hasConversation)
          const allUsers = [...usersWithConversations, ...updatedUsers]
          setUsers(allUsers)
          setLoading(false)
        })
      })
    } else if (!open) {
      setSearchQuery('')
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

  const handleCreateConversation = async (otherUserId: string) => {
    if (!user) return

    setCreating(String(otherUserId))
    const conversation = await createConversation(String(user.id), String(otherUserId))
    
    if (conversation) {
      onConversationCreated(String(conversation.id))
      onOpenChange(false)
      setSearchQuery('')
    }
    
    setCreating(null)
  }

  const handleSendRequest = async (otherUserId: string) => {
    if (!user) return

    setRequesting(String(otherUserId))
    const request = await createChatRequest(String(user.id), String(otherUserId))
    
    if (request) {
      const usersData = await getUsers()
      const otherUsers = usersData.filter((u) => u.id !== user.id)
      const conversations = await getConversations(user.id)
      
      const usersWithStatus = otherUsers.map((u) => {
        const existingConv = conversations.find(
          (c) => !c.is_group && 
          (c.user1_id === user.id && c.user2_id === u.id || 
           c.user1_id === u.id && c.user2_id === user.id)
        )
        
        return {
          ...u,
          hasConversation: !!existingConv,
          existingConversationId: existingConv?.id || null,
        }
      })
      
      const updatedUsers = usersWithStatus.map((u) => {
        if (u.id === otherUserId) {
          return {
            ...u,
            canRequest: false,
            cooldownHours: null,
          }
        }
        return u
      })
      
      setUsers(updatedUsers)
      onOpenChange(false)
      setSearchQuery('')
    }
    
    setRequesting(null)
  }

  const handleOpenExistingChat = (conversationId: string) => {
    onConversationCreated(conversationId)
    onOpenChange(false)
    setSearchQuery('')
  }

  if (!open) return null

  return (
    <div className="flex flex-col rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#1a1a1a] text-black dark:text-white shadow-xl w-80 max-h-[28rem] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-black/10 dark:border-white/10">
        <Search className="h-4 w-4 shrink-0 text-black/40 dark:text-white/40" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none border-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:border-none text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!searchQuery.trim() ? (
          <div className="text-center py-8 text-xs text-black/40 dark:text-white/40">
            Search by name or username
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="loader" style={{ width: '24px', height: '24px' }}></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-xs text-black/40 dark:text-white/40">
            No users found
          </div>
        ) : (
          <div className="py-1">
            {filteredUsers.map((userItem) => {
              const isCreating = creating === String(userItem.id)
              const isRequesting = requesting === String(userItem.id)
              const isLoading = isCreating || isRequesting
              
              return (
                <button
                  key={userItem.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => {
                    if (userItem.hasConversation && userItem.existingConversationId) {
                      handleOpenExistingChat(userItem.existingConversationId)
                    } else if (userItem.canRequest !== false) {
                      handleSendRequest(String(userItem.id))
                    }
                  }}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <ThemeAvatarImage avatarUrl={userItem.avatar_url} alt={userItem.name} />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {userItem.fullname || userItem.username || userItem.email}
                    </p>
                    {userItem.username && (
                      <p className="text-xs text-black/50 dark:text-white/50 truncate">@{userItem.username}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isLoading ? (
                      <div className="loader" style={{ width: '14px', height: '14px', border: '1px solid' }}></div>
                    ) : userItem.hasConversation ? (
                      <MessageSquare size={14} className="text-black/40 dark:text-white/40" />
                    ) : userItem.canRequest !== false ? (
                      <Mailbox size={14} className="text-black/40 dark:text-white/40" />
                    ) : (
                      <span className="text-[10px] text-black/40 dark:text-white/40">
                        {userItem.cooldownHours && userItem.cooldownHours > 0
                          ? `${Math.ceil(userItem.cooldownHours)}h`
                          : 'Sent'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
