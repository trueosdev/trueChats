"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Lock,
  Users,
  Pin,
  LineSquiggle,
  Settings,
  ChevronLeft,
  Camera,
  Check,
  Loader2,
  Video,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Folder,
} from 'lucide-react'
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
import {
  createThreadFolder,
  deleteThreadFolder,
  updateThread,
  updateThreadFolder,
} from '@/lib/services/threads'
import type { Loom, Thread, ThreadFolder } from '@/app/data'
import { FolderNameCard } from '@/components/loom/folder-name-card'
import {
  THREAD_FOLDER_NAME_MAX_CHARS,
  THREAD_NAME_MAX_CHARS,
} from '@/lib/thread-field-limits'

type VoiceCallParticipantPreview = {
  identity: string
  name: string
  avatarUrl: string | null
}

function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0] + parts[1]![0]).toUpperCase().slice(0, 2)
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

function VoiceCallParticipantAvatars({
  participants,
}: {
  participants: VoiceCallParticipantPreview[]
}) {
  if (participants.length === 0) return null
  const shown = participants.slice(0, 3)
  const extra = participants.length - shown.length
  return (
    <div
      className="pointer-events-none flex shrink-0 items-center pl-1"
      aria-label={`${participants.length} in call`}
    >
      <div className="flex items-center">
        {shown.map((p, i) => (
          <span
            key={p.identity || `p-${i}`}
            title={p.name}
            className={cn(i > 0 && '-ml-2')}
          >
            <Avatar
              className={cn(
                'relative h-6 w-6 border-2 border-background text-[10px]',
                i === 0 && 'z-[1]',
                i === 1 && 'z-[2]',
                i === 2 && 'z-[3]',
              )}
            >
              <AvatarImage src={p.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-[9px] font-medium">
                {initialsFromDisplayName(p.name)}
              </AvatarFallback>
            </Avatar>
          </span>
        ))}
      </div>
      {extra > 0 ? (
        <span className="ml-1 text-[11px] tabular-nums text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

interface ThreadListProps {
  loom: Loom
  threads: Thread[]
  threadFolders: ThreadFolder[]
  selectedThreadId: string | null
  onThreadSelect: (threadId: string) => void
  /** Optional folder to create the new thread inside */
  onCreateThread: (folderId?: string | null) => void
  onShowMembers: () => void
  loading?: boolean
  isCollapsed?: boolean
}

const UNCATEGORIZED_FOLDER_KEY = '__uncategorized__'

function folderOpenStorageKey(loomId: string) {
  return `tc-folder-open:${loomId}`
}

export function ThreadList({
  loom,
  threads,
  threadFolders,
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
  onShowMembers,
  loading = false,
  isCollapsed = false,
}: ThreadListProps) {
  const { user, session } = useAuth()
  const addThreadFolder = useChatStore((s) => s.addThreadFolder)
  const updateThreadFolderStore = useChatStore((s) => s.updateThreadFolder)
  const removeThreadFolderStore = useChatStore((s) => s.removeThreadFolder)
  const [sidebarView, setSidebarView] = useState<'threads' | 'settings'>('threads')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [folderOpenMap, setFolderOpenMap] = useState<Record<string, boolean>>({})
  const [newFolderPopoverOpen, setNewFolderPopoverOpen] = useState(false)
  const [newFolderFormKey, setNewFolderFormKey] = useState(0)
  const [renameTarget, setRenameTarget] = useState<ThreadFolder | null>(null)
  const [folderNameBusy, setFolderNameBusy] = useState(false)
  const [dragOverDropId, setDragOverDropId] = useState<string | null>(null)
  const livekitConfigured = Boolean(
    process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim(),
  )
  const voiceThreadIdsKey = useMemo(
    () =>
      threads
        .filter((t) => t.category === 'voice')
        .map((t) => t.id)
        .sort()
        .join(','),
    [threads],
  )
  const [voiceCallParticipantsByThreadId, setVoiceCallParticipantsByThreadId] =
    useState<Record<string, VoiceCallParticipantPreview[]>>({})

  useEffect(() => {
    const voiceThreadIds = voiceThreadIdsKey
      ? voiceThreadIdsKey.split(',')
      : []
    if (
      !livekitConfigured ||
      !session?.access_token ||
      voiceThreadIds.length === 0
    ) {
      setVoiceCallParticipantsByThreadId({})
      return
    }

    let cancelled = false

    const tick = async () => {
      const entries = await Promise.all(
        voiceThreadIds.map(async (id) => {
          const roomName = `thread-${id}`
          try {
            const res = await fetch(
              `/api/livekit/room-participants?roomName=${encodeURIComponent(roomName)}`,
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              },
            )
            if (!res.ok) return [id, []] as const
            const data = (await res.json()) as {
              participants?: VoiceCallParticipantPreview[]
            }
            const list = Array.isArray(data.participants)
              ? data.participants
              : []
            return [id, list] as const
          } catch {
            return [id, []] as const
          }
        }),
      )
      if (cancelled) return
      setVoiceCallParticipantsByThreadId(Object.fromEntries(entries))
    }

    void tick()
    const interval = setInterval(() => void tick(), 8000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [livekitConfigured, session?.access_token, voiceThreadIdsKey])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(folderOpenStorageKey(loom.id))
      setFolderOpenMap(raw ? (JSON.parse(raw) as Record<string, boolean>) : {})
    } catch {
      setFolderOpenMap({})
    }
  }, [loom.id])

  const isFolderExpanded = useCallback(
    (id: string) => folderOpenMap[id] !== false,
    [folderOpenMap],
  )

  const toggleFolderOpen = useCallback(
    (id: string) => {
      setFolderOpenMap((prev) => {
        const wasOpen = prev[id] !== false
        const next = { ...prev, [id]: !wasOpen }
        try {
          localStorage.setItem(
            folderOpenStorageKey(loom.id),
            JSON.stringify(next),
          )
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [loom.id],
  )

  const sortedFolders = useMemo(
    () =>
      [...threadFolders].sort(
        (a, b) =>
          a.position - b.position || a.created_at.localeCompare(b.created_at),
      ),
    [threadFolders],
  )

  const pinnedThreads = threads.filter((t) => t.is_pinned)
  const regularThreads = threads.filter((t) => !t.is_pinned)

  const collapsedThreadOrder = useMemo(() => {
    const out: Thread[] = [...pinnedThreads]
    for (const f of sortedFolders) {
      out.push(
        ...regularThreads
          .filter((t) => t.folder_id === f.id)
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          ),
      )
    }
    out.push(
      ...regularThreads
        .filter((t) => !t.folder_id)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        ),
    )
    return out
  }, [pinnedThreads, regularThreads, sortedFolders])

  const openFolderExpanded = useCallback((folderId: string) => {
    setFolderOpenMap((prev) => {
      const next = { ...prev, [folderId]: true }
      try {
        localStorage.setItem(
          folderOpenStorageKey(loom.id),
          JSON.stringify(next),
        )
      } catch {
        /* ignore */
      }
      return next
    })
  }, [loom.id])

  const moveThreadToFolder = useCallback(
    async (threadId: string, folderId: string | null) => {
      const thread = threads.find((t) => t.id === threadId)
      if (!thread || thread.folder_id === folderId) return
      const ok = await updateThread(threadId, { folder_id: folderId })
      if (ok) {
        useChatStore.getState().updateThread(threadId, { folder_id: folderId })
        if (folderId) openFolderExpanded(folderId)
      }
    },
    [threads, openFolderExpanded],
  )

  const confirmNewFolder = async (trimmed: string) => {
    if (!user) return
    setFolderNameBusy(true)
    try {
      const folder = await createThreadFolder({
        loomId: loom.id,
        name: trimmed,
        createdBy: String(user.id),
      })
      if (folder) {
        addThreadFolder(folder)
        setNewFolderPopoverOpen(false)
      }
    } finally {
      setFolderNameBusy(false)
    }
  }

  const confirmRenameFolder = async (trimmed: string) => {
    if (!renameTarget) return
    if (trimmed === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    setFolderNameBusy(true)
    try {
      const ok = await updateThreadFolder(renameTarget.id, { name: trimmed })
      if (ok) updateThreadFolderStore(renameTarget.id, { name: trimmed })
      setRenameTarget(null)
    } finally {
      setFolderNameBusy(false)
    }
  }

  const handleDeleteFolder = async (folder: ThreadFolder) => {
    if (
      !window.confirm(
        `Delete folder "${folder.name}"? Threads inside will move to the uncategorized list.`,
      )
    ) {
      return
    }
    const ok = await deleteThreadFolder(folder.id)
    if (ok) removeThreadFolderStore(folder.id)
  }

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
            collapsedThreadOrder.map((thread) => (
              <TooltipProvider key={thread.id}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onThreadSelect(thread.id)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-8 w-8 shrink-0",
                        selectedThreadId === thread.id && "bg-primary/10",
                      )}
                    >
                      {thread.category === "voice" ? (
                        <Video size={14} />
                      ) : thread.type === "private" ? (
                        <Lock size={14} />
                      ) : (
                        <LineSquiggle size={14} />
                      )}
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
                  type="button"
                  onClick={() => onCreateThread(null)}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-8 w-8",
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
    <>
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
                  <p className="truncate text-[11px] text-muted-foreground/50">{loom.description}</p>
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
              type="button"
              onClick={() => onCreateThread(null)}
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
                {pinnedThreads.map((thread) => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    voiceCallParticipants={
                      voiceCallParticipantsByThreadId[thread.id]
                    }
                    selected={selectedThreadId === thread.id}
                    onSelect={() => onThreadSelect(thread.id)}
                    onDragEnd={() => setDragOverDropId(null)}
                  />
                ))}
              </div>
            )}

            {sortedFolders.map((folder, folderIndex) => {
              const inFolder = regularThreads.filter((t) => t.folder_id === folder.id)
              const open = isFolderExpanded(folder.id)
              const dropId = `folder-${folder.id}`
              return (
                <div
                  key={folder.id}
                  className={cn(
                    "transition-colors",
                    folderIndex > 0 && "border-t border-border pt-1.5",
                    dragOverDropId === dropId &&
                      "bg-primary/10 ring-2 ring-primary/30 ring-inset",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "move"
                    setDragOverDropId(dropId)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverDropId(null)
                    const id = e.dataTransfer.getData("text/plain")
                    if (id) void moveThreadToFolder(id, folder.id)
                  }}
                >
                  <div className="flex items-center gap-0.5 pr-1">
                    <button
                      type="button"
                      onClick={() => toggleFolderOpen(folder.id)}
                      className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform",
                          open && "rotate-90",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateThread(folder.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="New thread in folder"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Folder options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setRenameTarget(folder)}>
                          Rename folder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => void handleDeleteFolder(folder)}
                        >
                          Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {open && (
                    <div className="mt-0.5 min-h-[1.75rem] space-y-0.5 pl-0.5">
                      {inFolder.length === 0 ? (
                        <p className="px-2 py-2 text-[11px] text-muted-foreground/80">
                          Drop threads here or use + to add one
                        </p>
                      ) : (
                        inFolder.map((thread) => (
                          <ThreadItem
                            key={thread.id}
                            thread={thread}
                            voiceCallParticipants={
                              voiceCallParticipantsByThreadId[thread.id]
                            }
                            selected={selectedThreadId === thread.id}
                            onSelect={() => onThreadSelect(thread.id)}
                            onDragEnd={() => setDragOverDropId(null)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {(() => {
              const uncategorized = regularThreads.filter((t) => !t.folder_id)
              if (uncategorized.length === 0) return null
              if (sortedFolders.length > 0) {
                const open = isFolderExpanded(UNCATEGORIZED_FOLDER_KEY)
                return (
                  <div
                    className={cn(
                      "border-t border-border pt-1.5 transition-colors mt-1.5",
                      dragOverDropId === "uncategorized" &&
                        "bg-primary/10 ring-2 ring-primary/30 ring-inset",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                      setDragOverDropId("uncategorized")
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverDropId(null)
                      const id = e.dataTransfer.getData("text/plain")
                      if (id) void moveThreadToFolder(id, null)
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFolderOpen(UNCATEGORIZED_FOLDER_KEY)}
                      className="flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform",
                          open && "rotate-90",
                        )}
                        aria-hidden
                      />
                      <span>Threads</span>
                    </button>
                    {open && (
                      <div className="mt-0.5 min-h-[1.75rem] space-y-0.5 pl-0.5">
                        {uncategorized.map((thread) => (
                          <ThreadItem
                            key={thread.id}
                            thread={thread}
                            voiceCallParticipants={
                              voiceCallParticipantsByThreadId[thread.id]
                            }
                            selected={selectedThreadId === thread.id}
                            onSelect={() => onThreadSelect(thread.id)}
                            onDragEnd={() => setDragOverDropId(null)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <div>
                  {pinnedThreads.length > 0 && (
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Threads
                    </p>
                  )}
                  {uncategorized.map((thread) => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      voiceCallParticipants={
                        voiceCallParticipantsByThreadId[thread.id]
                      }
                      selected={selectedThreadId === thread.id}
                      onSelect={() => onThreadSelect(thread.id)}
                      onDragEnd={() => setDragOverDropId(null)}
                    />
                  ))}
                </div>
              )
            })()}

            <Popover
              open={newFolderPopoverOpen}
              onOpenChange={(open) => {
                setNewFolderPopoverOpen(open)
                if (open) setNewFolderFormKey((k) => k + 1)
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground/30 transition-colors hover:text-foreground"
                >
                  <Folder size={14} className="shrink-0" />
                  <span>New folder</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={6}
                className="w-auto border-0 bg-transparent p-0 shadow-none"
              >
                <FolderNameCard
                  key={newFolderFormKey}
                  variant="create"
                  busy={folderNameBusy}
                  onClose={() => setNewFolderPopoverOpen(false)}
                  onConfirm={confirmNewFolder}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => onCreateThread(null)}
              className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground/30 transition-colors hover:text-foreground"
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

    {renameTarget ? (
      <div
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
        role="presentation"
        onClick={() => {
          if (!folderNameBusy) setRenameTarget(null);
        }}
      >
        <div
          role="dialog"
          aria-modal
          className="shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <FolderNameCard
            key={renameTarget.id}
            variant="rename"
            initialName={renameTarget.name}
            busy={folderNameBusy}
            onClose={() => {
              if (!folderNameBusy) setRenameTarget(null);
            }}
            onConfirm={confirmRenameFolder}
          />
        </div>
      </div>
    ) : null}
    </>
  )
}

function ThreadItem({
  thread,
  voiceCallParticipants,
  selected,
  onSelect,
  onDragEnd,
}: {
  thread: Thread
  voiceCallParticipants?: VoiceCallParticipantPreview[]
  selected: boolean
  onSelect: () => void
  onDragEnd?: () => void
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
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", thread.id)
          e.dataTransfer.effectAllowed = "move"
        }}
        onDragEnd={() => onDragEnd?.()}
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none active:cursor-grabbing",
          !selected && "hover:text-foreground",
        )}
      >
        {thread.category === "voice" ? (
          <Video size={14} className="shrink-0" />
        ) : thread.type === "private" ? (
          <Lock size={14} className="shrink-0" />
        ) : (
          <LineSquiggle size={14} className="shrink-0" />
        )}
        <span className="truncate">{thread.name}</span>
        {thread.is_pinned && (
          <Pin size={10} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {thread.category === 'voice' &&
      voiceCallParticipants &&
      voiceCallParticipants.length > 0 ? (
        <VoiceCallParticipantAvatars participants={voiceCallParticipants} />
      ) : null}

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
