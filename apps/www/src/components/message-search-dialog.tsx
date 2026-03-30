"use client"

import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
import { ThemeAvatarImage } from './ui/theme-avatar'
import { useColorTheme } from '@/hooks/useColorTheme'
import { Message } from '@/app/data'
// Format date helper
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    })
  } catch {
    return ''
  }
}

interface MessageSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: Message[]
  conversationName: string
}

export function MessageSearchDialog({ 
  open, 
  onOpenChange, 
  messages, 
  conversationName 
}: MessageSearchDialogProps) {
  const { colorTheme } = useColorTheme()
  const isBlackWhite = colorTheme.name === "Black & White"
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    const query = searchQuery.toLowerCase()
    return messages.filter((msg) => {
      const content = msg.message || ''
      return content.toLowerCase().includes(query)
    })
  }, [messages, searchQuery])

  const handleMessageClick = (messageId: string) => {
    // Scroll to message in chat
    const element = document.querySelector(`[data-message-id="${messageId}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the message briefly
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
      }, 2000)
    }
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-white/10">
      <div className="bg-white dark:bg-black border border-black dark:border-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-none">
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Search Messages
            </h2>
            <p className="text-sm text-black/70 dark:text-white/70">{conversationName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onOpenChange(false)
              setSearchQuery('')
            }}
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
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black dark:border-white rounded-md bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              autoFocus
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-black/70 dark:text-white/70 mt-2">
              {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!searchQuery ? (
            <div className="text-center py-8 text-black dark:text-white">
              <p>Type to search messages in this conversation</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-black dark:text-white">
              <p>No messages found matching &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => {
                const messageContent = message.message || ''
                const queryIndex = messageContent.toLowerCase().indexOf(searchQuery.toLowerCase())
                const beforeMatch = messageContent.substring(0, queryIndex)
                const match = messageContent.substring(queryIndex, queryIndex + searchQuery.length)
                const afterMatch = messageContent.substring(queryIndex + searchQuery.length)
                
                return (
                  <button
                    key={message.id}
                    onClick={() => handleMessageClick(String(message.id))}
                    className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <ThemeAvatarImage avatarUrl={message.avatar} alt={message.name} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-black dark:text-white">
                          {message.name}
                        </p>
                        <span className="text-xs text-black/70 dark:text-white/70">
                          {message.timestamp || (message.created_at ? formatDate(message.created_at) : '')}
                        </span>
                      </div>
                      <p className="text-sm text-black dark:text-white break-words">
                        {beforeMatch}
                        <mark className={`px-0.5 rounded ${
                          isBlackWhite 
                            ? "bg-foreground text-background" 
                            : "bg-yellow-200 dark:bg-yellow-900"
                        }`}>
                          {match}
                        </mark>
                        {afterMatch}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

