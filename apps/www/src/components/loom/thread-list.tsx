"use client"

import { Hash, Lock, Users, Pin, LineSquiggle, Settings } from 'lucide-react'
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
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
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
  const pinnedThreads = threads.filter(t => t.is_pinned)
  const regularThreads = threads.filter(t => !t.is_pinned)
  const LoomIcon = (() => {
    const iconName = loom.icon_name || 'Users'
    const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
    return Icon || Users
  })()

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-2 h-full">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <button className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0 hover:bg-black/15 dark:hover:bg-white/15 transition-colors">
                    <LoomIcon size={16} className="text-black dark:text-white" />
                  </button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-44">
                <DropdownMenuItem onClick={onShowMembers}>
                  <Users size={14} className="mr-2" />
                  <span>Add Members</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings size={14} className="mr-2" />
                  <span>Settings (Soon)</span>
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
                      {thread.type === 'private' ? <Lock size={14} /> : <Hash size={14} />}
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
      <div className="px-3 pt-4 pb-2 border-b border-black/5 dark:border-white/5 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                <LoomIcon size={16} className="text-black dark:text-white" />
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
            <DropdownMenuItem disabled>
              <Settings size={14} className="mr-2" />
              <span>Settings (Soon)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Thread list */}
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
            <p className="text-xs text-black/40 dark:text-white/40">No threads yet</p>
            <button
              onClick={onCreateThread}
              className="inline-flex items-center gap-1.5 text-xs text-black/45 dark:text-white/45 hover:text-black/65 dark:hover:text-white/65 mt-2"
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
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-sm text-black/45 dark:text-white/45 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black/65 dark:hover:text-white/65 mt-1"
            >
              <LineSquiggle size={14} className="shrink-0" />
              <span>New Thread</span>
            </button>
          </>
        )}
      </nav>
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
          : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
      )}
    >
      {thread.type === 'private' ? (
        <Lock size={14} className="shrink-0" />
      ) : (
        <Hash size={14} className="shrink-0" />
      )}
      <span className="truncate">{thread.name}</span>
      {thread.is_pinned && <Pin size={10} className="shrink-0 text-black/30 dark:text-white/30" />}
    </button>
  )
}
