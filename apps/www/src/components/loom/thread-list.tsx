"use client"

import { useRef, useState } from 'react'
import { Lock, Users, Pin, LineSquiggle, Settings, ChevronLeft, Camera, Check, Loader2, Video } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { updateLoom, uploadLoomIcon } from '@/lib/services/looms'
import type { Loom, Thread } from '@/app/data'

interface ThreadListProps {
  loom: Loom
  threads: Thread[]
  selectedThreadId: string | null
  onThreadSelect: (threadId: string) => void
  onCreateThread: () => void
  onShowMembers: () => void
  loading?: boolean
  isCollapsed?: boolean
}

export function ThreadList({
  loom,
  threads,
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
  onShowMembers,
  loading = false,
  isCollapsed = false,
}: ThreadListProps) {
  const { user } = useAuth()
  const [sidebarView, setSidebarView] = useState<'threads' | 'settings'>('threads')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const pinnedThreads = threads.filter(t => t.is_pinned)
  const regularThreads = threads.filter(t => !t.is_pinned)
  const LoomIcon = (() => {
    const iconName = loom.icon_name || 'Users'
    const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
    return Icon || Users
  })()

  const openSettings = () => {
    setSidebarView('settings')
    setEditName(loom.name || '')
    setEditDescription(loom.description || '')
    setSelectedPhotoFile(null)
    setSelectedPhotoPreview(null)
    setSettingsError(null)
    setSaveSuccess(false)
  }

  const closeSettings = () => {
    if (saving) return
    setSidebarView('threads')
    setSettingsError(null)
    setSaveSuccess(false)
  }

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setSettingsError('Please select a valid image (JPEG, PNG, or WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSettingsError('File size must be less than 5 MB.')
      return
    }

    setSettingsError(null)
    setSelectedPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setSelectedPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setSelectedPhotoFile(null)
    setSelectedPhotoPreview('__remove__')
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const saveSettings = async () => {
    if (!user) return

    const trimmedName = editName.trim()
    if (!trimmedName) {
      setSettingsError('Name cannot be empty.')
      return
    }

    setSaving(true)
    setSettingsError(null)
    setSaveSuccess(false)

    const updates: { name?: string; icon_url?: string | null; description?: string } = {}

    if (trimmedName !== loom.name) updates.name = trimmedName
    if (editDescription.trim() !== (loom.description || '')) updates.description = editDescription.trim()

    if (selectedPhotoFile) {
      const uploadedUrl = await uploadLoomIcon(String(user.id), loom.id, selectedPhotoFile)
      if (!uploadedUrl) {
        setSettingsError('Failed to upload photo.')
        setSaving(false)
        return
      }
      updates.icon_url = uploadedUrl
    } else if (selectedPhotoPreview === '__remove__') {
      updates.icon_url = null
    }

    if (Object.keys(updates).length === 0) {
      setSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 1500)
      return
    }

    const ok = await updateLoom(loom.id, updates, String(user.id))
    if (!ok) {
      setSettingsError('Failed to save. Check your permissions.')
      setSaving(false)
      return
    }

    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 1500)
  }

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-2 h-full">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <button className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0 hover:bg-black/15 dark:hover:bg-white/15 transition-colors">
                    {loom.icon_url ? (
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={loom.icon_url} alt={loom.name} />
                        <AvatarFallback className="rounded-lg bg-black/10 dark:bg-white/10">
                          <LoomIcon size={16} className="text-black dark:text-white" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <LoomIcon size={16} className="text-black dark:text-white" />
                    )}
                  </button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-44">
                <DropdownMenuItem onClick={onShowMembers}>
                  <Users size={14} className="mr-2" />
                  <span>Add Members</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openSettings}>
                  <Settings size={14} className="mr-2" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent side="right">{loom.name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-6 border-t border-black/10 dark:border-white/10 my-1" />

        <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1 w-full">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
            ))
          ) : (
            [...pinnedThreads, ...regularThreads].map(thread => (
              <TooltipProvider key={thread.id}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onThreadSelect(thread.id)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-8 w-8 shrink-0",
                        selectedThreadId === thread.id && "bg-black/10 dark:bg-white/10"
                      )}
                    >
                      {thread.category === 'voice' ? <Video size={14} /> : thread.type === 'private' ? <Lock size={14} /> : <LineSquiggle size={14} />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{thread.name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          )}
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={onShowMembers}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-8 w-8"
                  )}
                >
                  <Users size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Members</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={onCreateThread}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-8 w-8"
                  )}
                >
                  <LineSquiggle size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">New Thread</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-muted/10 dark:bg-muted/20">
      {/* Loom header */}
      <div className="px-3 pt-4 pb-2 border-b border-black/10 dark:border-white/10 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                {loom.icon_url ? (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={loom.icon_url} alt={loom.name} />
                    <AvatarFallback className="rounded-lg bg-black/10 dark:bg-white/10">
                      <LoomIcon size={16} className="text-black dark:text-white" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <LoomIcon size={16} className="text-black dark:text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="text-sm font-semibold text-black dark:text-white truncate">{loom.name}</h2>
                {loom.description && (
                  <p className="text-[11px] text-black/40 dark:text-white/40 truncate">{loom.description}</p>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-48">
            <DropdownMenuItem onClick={onShowMembers}>
              <Users size={14} className="mr-2" />
              <span>Add Members</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openSettings}>
              <Settings size={14} className="mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Thread list */}
      {sidebarView === 'threads' ? (
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2">
              <div className="w-4 h-4 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
              <div className="h-3.5 rounded bg-black/10 dark:bg-white/10 animate-pulse flex-1" />
            </div>
          ))
        ) : threads.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-black/30 dark:text-white/30">No threads yet</p>
            <button
              onClick={onCreateThread}
              className="inline-flex items-center gap-1.5 text-xs text-black/15 dark:text-white/15 hover:text-black/65 dark:hover:text-white/65 mt-2"
            >
              <LineSquiggle size={12} />
              <span>New Thread</span>
            </button>
          </div>
        ) : (
          <>
            {pinnedThreads.length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider px-2 py-1">
                  Pinned
                </p>
                {pinnedThreads.map(thread => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    selected={selectedThreadId === thread.id}
                    onSelect={() => onThreadSelect(thread.id)}
                  />
                ))}
              </div>
            )}
            {regularThreads.length > 0 && (
              <div>
                {pinnedThreads.length > 0 && (
                  <p className="text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider px-2 py-1">
                    Threads
                  </p>
                )}
                {regularThreads.map(thread => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    selected={selectedThreadId === thread.id}
                    onSelect={() => onThreadSelect(thread.id)}
                  />
                ))}
              </div>
            )}
            <button
              onClick={onCreateThread}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-sm text-black/15 dark:text-white/15 hover:text-black/35 dark:hover:text-white/35 mt-1"
            >
              <LineSquiggle size={14} className="shrink-0" />
              <span>New Thread</span>
            </button>
          </>
        )}
      </nav>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Settings header */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-black/10 dark:border-white/10">
            <button
              onClick={closeSettings}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7 shrink-0')}
            >
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-sm font-semibold text-black dark:text-white">Loom Settings</h3>
          </div>

          <div className="px-4 py-4 space-y-5">
            {/* Photo section */}
            <div className="flex flex-col items-center gap-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoFileSelect}
                className="hidden"
              />
              <button
                onClick={() => photoInputRef.current?.click()}
                className="relative group"
              >
                <div className="w-20 h-20 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden transition-colors group-hover:border-black/20 dark:group-hover:border-white/20">
                  {selectedPhotoPreview && selectedPhotoPreview !== '__remove__' ? (
                    <img src={selectedPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : loom.icon_url && selectedPhotoPreview !== '__remove__' ? (
                    <img src={loom.icon_url} alt={loom.name} className="w-full h-full object-cover" />
                  ) : (
                    <LoomIcon size={28} className="text-black/30 dark:text-white/30" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
                  <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
                >
                  Upload
                </button>
                {(loom.icon_url || (selectedPhotoPreview && selectedPhotoPreview !== '__remove__')) && (
                  <>
                    <span className="text-black/20 dark:text-white/20">|</span>
                    <button
                      onClick={removePhoto}
                      className="text-xs text-black/50 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
                Loom Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Give your Loom a name"
                className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 text-sm outline-none border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20 text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25"
              />
            </div>

            {/* Description field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="What's this Loom about?"
                className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 text-sm outline-none border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20 text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 resize-none"
              />
            </div>

            {/* Error */}
            {settingsError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{settingsError}</p>
            )}

            {/* Save button */}
            <button
              onClick={saveSettings}
              disabled={saving}
              className={cn(
                buttonVariants({ variant: 'default' }),
                'w-full h-9 gap-2'
              )}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} />
                  Saved
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ThreadItem({ thread, selected, onSelect }: {
  thread: Thread
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-sm",
        selected
          ? "bg-black/10 dark:bg-white/10 text-black dark:text-white font-medium"
          : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
      )}
    >
      {thread.category === 'voice' ? (
        <Video size={14} className="shrink-0" />
      ) : thread.type === 'private' ? (
        <Lock size={14} className="shrink-0" />
      ) : (
        <LineSquiggle size={14} className="shrink-0" />
      )}
      <span className="truncate">{thread.name}</span>
      {thread.is_pinned && <Pin size={10} className="shrink-0 text-black/30 dark:text-white/30" />}
    </button>
  )
}
