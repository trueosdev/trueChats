"use client"

import { MessageCircle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { RAIL_WIDTH } from '@/lib/layout-constants'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../ui/tooltip'
import { UnreadBadge } from '../ui/unread-badge'
import type { Loom } from '@/app/data'

interface LoomSidebarProps {
  looms: Loom[]
  loomUnreadCounts: Record<string, number>
  selectedLoomId: string | null
  viewMode: 'dms' | 'looms'
  onLoomSelect: (loomId: string) => void
  onDmsSelect: () => void
  onCreateLoom: () => void
  loading?: boolean
}

export function LoomSidebar({
  looms,
  loomUnreadCounts,
  selectedLoomId,
  viewMode,
  onLoomSelect,
  onDmsSelect,
  onCreateLoom,
  loading = false,
}: LoomSidebarProps) {
  const loomHoverEffect =
    "hover:rounded-xl hover:bg-black/20 dark:hover:bg-white/20 hover:shadow-[0_0_8px_2px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_0_8px_2px_rgba(255,255,255,0.03)]"

  return (
    <div
      className="flex flex-col items-center bg-transparent py-3 gap-2 h-full shrink-0 overflow-y-auto electron-no-drag border-none"
      style={{ width: RAIL_WIDTH }}
    >
      {/* DMs button */}
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={onDmsSelect}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:text-black dark:hover:text-white",
                loomHoverEffect,
                viewMode === 'dms'
                  ? "bg-black text-white dark:bg-white dark:text-black rounded-xl"
                  : "bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60"
              )}
            >
              <MessageCircle strokeWidth={1.5} size={22} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Direct Messages</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Divider */}
      <div className="w-8 h-[2px] rounded-full bg-black/10 dark:bg-white/10 my-0.5" />

      {/* Loom icons */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-12 h-12 rounded-2xl bg-black/10 dark:bg-white/10 animate-pulse" />
        ))
      ) : (
        looms.map((loom) => {
          const iconName = loom.icon_name || 'Users'
          const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
          const FallbackIcon = LucideIcons.Users
          const LoomIcon = Icon || FallbackIcon
          const isSelected = viewMode === 'looms' && selectedLoomId === loom.id
          const hasImageIcon = Boolean(loom.icon_url)
          const unreadCount = loomUnreadCounts[loom.id] || 0

          return (
            <TooltipProvider key={loom.id}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    {/* Selection indicator pill */}
                    {isSelected && (
                      <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-8 bg-black dark:bg-white rounded-r-full" />
                    )}
                    <button
                      onClick={() => onLoomSelect(loom.id)}
                      className={cn(
                        "group w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                        loomHoverEffect,
                        isSelected
                          ? hasImageIcon
                            ? "bg-transparent text-black dark:text-white rounded-xl"
                            : "bg-black text-white dark:bg-white dark:text-black rounded-xl"
                          : "bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60"
                      )}
                    >
                      {loom.icon_url ? (
                        <Avatar className="h-12 w-12 rounded-2xl transition-all duration-200 group-hover:rounded-xl">
                          <AvatarImage src={loom.icon_url} alt={loom.name} className="transition-all duration-200 group-hover:rounded-xl" />
                          <AvatarFallback className="rounded-2xl transition-all duration-200 group-hover:rounded-xl bg-black/10 dark:bg-white/10">
                            <LoomIcon size={18} />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <LoomIcon size={22} />
                      )}
                    </button>
                    <UnreadBadge
                      count={unreadCount}
                      className="absolute -top-1 -right-1"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{loom.name}</p>
                  {loom.member_count !== undefined && (
                    <p className="text-xs opacity-70">{loom.member_count} members</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })
      )}

      {/* Create Loom button */}
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={onCreateLoom}
              className={cn(
                "group w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 text-black dark:text-white flex items-center justify-center hover:text-black/80 dark:hover:text-white/80 hover:rounded-xl transition-all duration-200",
                loomHoverEffect
              )}
            >
              <img src="/loom.svg" alt="Create Loom" className="h-[22px] w-[22px] transition-transform duration-200 group-hover:rotate-45 dark:invert" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Create a Loom</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
