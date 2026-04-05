"use client"

import { useEffect, useRef, useState } from 'react'
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { useAuth } from '@/hooks/useAuth'
import useChatStore from '@/hooks/useChatStore'
import { updateLoom, uploadLoomIcon } from '@/lib/services/looms'
import { updateThread } from '@/lib/services/threads'
import type { Loom, Thread } from '@/app/data'
import { THREAD_NAME_MAX_CHARS } from '@/lib/thread-field-limits'

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
      setSettingsError('You don\'t have permission to update this Loom.')
      setSaving(false)
      return
    }

    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 1500)
  }

  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 bg-background px-2 py-2">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted">
                    {loom.icon_url ? (
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={loom.icon_url} alt={loom.name} />
                        <AvatarFallback className="rounded-lg bg-muted">
                          <LoomIcon size={16} className="text-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <LoomIcon size={16} className="text-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-44">
                <DropdownMenuItem onClick={onShowMembers}>
                  <Users size={14} className="mr-2" />
                  <span>Members</span>
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

        <div className="my-1 w-6 border-t border-border" />

        <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1 w-full">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-8 animate-pulse rounded bg-muted" />
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
                        selectedThreadId === thread.id && "bg-primary/10"
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
    <div className="flex h-full flex-col bg-background">
      {/* Loom header */}
      <div className="shrink-0 border-b border-border px-3 pb-2 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mb-2 flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                {loom.icon_url ? (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={loom.icon_url} alt={loom.name} />
                    <AvatarFallback className="rounded-lg bg-muted">
                      <LoomIcon size={16} className="text-foreground" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <LoomIcon size={16} className="text-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <h2 className="truncate text-sm font-semibold text-foreground">{loom.name}</h2>
                {loom.description && (
                  <p className="truncate text-[11px] text-muted-foreground">{loom.description}</p>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-48">
            <DropdownMenuItem onClick={onShowMembers}>
              <Users size={14} className="mr-2" />
              <span>Members</span>
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
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
            </div>
          ))
        ) : threads.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-muted-foreground">No threads yet</p>
            <button
              onClick={onCreateThread}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground"
            >
              <LineSquiggle size={12} />
              <span>New Thread</span>
            </button>
          </div>
        ) : (
          <>
            {pinnedThreads.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
              className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground/70 transition-colors hover:text-foreground"
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
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            <button
              onClick={closeSettings}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7 shrink-0')}
            >
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-sm font-semibold text-foreground">Loom Settings</h3>
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
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-background transition-colors group-hover:border-muted-foreground/30">
                  {selectedPhotoPreview && selectedPhotoPreview !== '__remove__' ? (
                    <img src={selectedPhotoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : loom.icon_url && selectedPhotoPreview !== '__remove__' ? (
                    <img src={loom.icon_url} alt={loom.name} className="h-full w-full object-cover" />
                  ) : (
                    <LoomIcon size={28} className="text-muted-foreground" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
                  <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Upload
                </button>
                {(loom.icon_url || (selectedPhotoPreview && selectedPhotoPreview !== '__remove__')) && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <button
                      onClick={removePhoto}
                      className="text-xs text-muted-foreground transition-colors hover:text-red-600 dark:hover:text-red-400"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Loom Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Give your Loom a name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Description field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="What's this Loom about?"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring"
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

function ThreadItem({
  thread,
  selected,
  onSelect,
}: {
  thread: Thread
  selected: boolean
  onSelect: () => void
}) {
  const { user } = useAuth()
  const updateThreadInStore = useChatStore((s) => s.updateThread)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editName, setEditName] = useState(thread.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settingsOpen) {
      setEditName(thread.name)
      setError(null)
    }
  }, [settingsOpen, thread.name])

  const handleSaveName = async () => {
    if (!user) return
    const trimmed = editName.trim()
    if (!trimmed) {
      setError('Name cannot be empty.')
      return
    }
    if (trimmed.length > THREAD_NAME_MAX_CHARS) {
      setError(`Name must be ${THREAD_NAME_MAX_CHARS} characters or fewer.`)
      return
    }
    if (trimmed === thread.name) {
      setSettingsOpen(false)
      return
    }
    setSaving(true)
    setError(null)
    const ok = await updateThread(thread.id, { name: trimmed })
    setSaving(false)
    if (!ok) {
      setError('Could not save. Try again.')
      return
    }
    updateThreadInStore(thread.id, { name: trimmed })
    setSettingsOpen(false)
  }

  return (
    <div
      className={cn(
        'group/thread-row flex items-center gap-0.5 rounded-md pr-1 text-sm transition-colors',
        selected
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted',
        selected && 'font-medium',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none',
          !selected && 'hover:text-foreground',
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
        {thread.is_pinned && (
          <Pin size={10} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Thread settings"
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-opacity hover:text-foreground',
              'opacity-0 group-hover/thread-row:opacity-100 data-[state=open]:opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Settings size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-auto border-0 bg-transparent p-0 shadow-none"
        >
          <div className="w-72 rounded-lg border border-border bg-background text-foreground shadow-xl">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Thread name</p>
            </div>
            <div className="space-y-3 p-3">
              <div className="space-y-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.slice(0, THREAD_NAME_MAX_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveName()
                  }}
                  maxLength={THREAD_NAME_MAX_CHARS}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                  placeholder="channel-name"
                  autoFocus
                />
                <p className="text-right text-[11px] tabular-nums text-muted-foreground">
                  {editName.length}/{THREAD_NAME_MAX_CHARS}
                </p>
              </div>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
              <button
                type="button"
                onClick={() => void handleSaveName()}
                disabled={saving}
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'h-9 w-full gap-2',
                )}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
