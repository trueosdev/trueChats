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
        // Filter out current user
        const otherUsers = usersData.filter((u) => u.id !== user.id)
        
        // Check conversation status for each user
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
        
        // Check request status for users without conversations
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
      // Reload users to update status
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
      
      // Update the specific user's status
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-white/10">
      <div className="bg-white dark:bg-black border-none rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-none">
          <h2 className="text-xl font-semibold text-black dark:text-white">New Chat</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="p-4 border-none">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black dark:border-white rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loader"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-black dark:text-white">
              {searchQuery ? 'No users found' : 'No users available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((userItem) => {
                const isCreating = creating === String(userItem.id)
                const isRequesting = requesting === String(userItem.id)
                const isLoading = isCreating || isRequesting
                
                return (
                  <div
                    key={userItem.id}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <ThemeAvatarImage avatarUrl={userItem.avatar_url} alt={userItem.name} />
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-black dark:text-white truncate">
                        {userItem.fullname || userItem.username || userItem.email}
                      </p>
                      {userItem.username && (
                        <p className="text-sm text-black/70 dark:text-white/70">@{userItem.username}</p>
                      )}
                      {userItem.hasConversation && (
                        <p className={`text-xs mt-1 ${
                          isBlackWhite 
                            ? "text-foreground" 
                            : "text-green-600 dark:text-green-400"
                        }`}>Existing chat</p>
                      )}
                      {userItem.cooldownHours !== null && userItem.cooldownHours !== undefined && userItem.cooldownHours > 0 && (
                        <p className={`text-xs mt-1 ${
                          isBlackWhite 
                            ? "text-foreground" 
                            : "text-orange-600 dark:text-orange-400"
                        }`}>
                          Cooldown: {Math.ceil(userItem.cooldownHours)}h
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {userItem.hasConversation ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenExistingChat(userItem.existingConversationId!)}
                          disabled={isLoading}
                          className="h-8"
                        >
                          <MessageSquare size={16} className="mr-1" />
                          Open Chat
                        </Button>
                      ) : userItem.canRequest !== false ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSendRequest(String(userItem.id))}
                          disabled={isLoading}
                          className="h-8"
                        >
                          <Mailbox size={16} className="mr-1" />
                          Request
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground px-2">
                          {userItem.cooldownHours && userItem.cooldownHours > 0
                            ? `Wait ${Math.ceil(userItem.cooldownHours)}h`
                            : 'Request sent'}
                        </span>
                      )}
                      {isLoading && (
                        <div className="flex items-center justify-center">
                          <div className="loader" style={{ width: '20px', height: '18px', border: '1px solid', padding: '0 3px' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

