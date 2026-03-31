"use client"

import { Plus, MessageCircle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../ui/tooltip'
import type { Loom } from '@/app/data'

interface LoomSidebarProps {
  looms: Loom[]
  selectedLoomId: string | null
  viewMode: 'dms' | 'looms'
  onLoomSelect: (loomId: string) => void
  onDmsSelect: () => void
  onCreateLoom: () => void
  loading?: boolean
}

export function LoomSidebar({
  looms,
  selectedLoomId,
  viewMode,
  onLoomSelect,
  onDmsSelect,
  onCreateLoom,
  loading = false,
}: LoomSidebarProps) {
  return (
    <div className="flex flex-col items-center w-[72px] bg-black/5 dark:bg-white/5 py-3 gap-2 h-full shrink-0 overflow-y-auto">
      {/* DMs button */}
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={onDmsSelect}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                viewMode === 'dms'
                  ? "bg-black text-white dark:bg-white dark:text-black rounded-xl"
                  : "bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60 hover:bg-black/20 dark:hover:bg-white/20 hover:rounded-xl"
              )}
            >
              <MessageCircle size={22} />
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
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                        isSelected
                          ? "bg-black text-white dark:bg-white dark:text-black rounded-xl"
                          : "bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60 hover:bg-black/20 dark:hover:bg-white/20 hover:rounded-xl"
                      )}
                    >
                      <LoomIcon size={22} />
                    </button>
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
              className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 hover:text-black/60 dark:hover:text-white/60 hover:rounded-xl transition-all duration-200"
            >
              <Plus size={22} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Create a Loom</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
