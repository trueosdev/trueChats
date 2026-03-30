"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, SquarePen, Users, Mailbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeAvatarImage } from "./ui/theme-avatar";
import * as LucideIcons from 'lucide-react';
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Message } from "@/app/data";
import { UserAvatarMenu } from "./user-avatar-menu";
import { Skeleton } from "./ui/skeleton";
import { NewChatDialog } from "./new-chat-dialog";
import { NewGroupDialog } from "./new-group-dialog";

interface SidebarProps {
  isCollapsed: boolean;
  chats: {
    id: string;
    name: string;
    messages: Message[];
    avatar: string;
    variant: "secondary" | "ghost";
    hasUnread?: boolean;
    isGroup?: boolean;
    participantCount?: number;
    iconName?: string | null;
  }[];
  onClick?: () => void;
  isMobile: boolean;
  onChatSelect?: (conversationId: string) => void;
  onNewChat?: () => void;
  onNewChatCreated?: (conversationId: string) => void;
  onNewGroup?: () => void;
  onGroupCreated?: (conversationId: string) => void;
  onPendingChats?: () => void;
  pendingRequestCount?: number;
  loading?: boolean;
}

export function Sidebar({ chats, isCollapsed, isMobile, onChatSelect, onNewChat, onNewChatCreated, onNewGroup, onGroupCreated, onPendingChats, pendingRequestCount = 0, loading = false }: SidebarProps) {
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative group flex flex-col h-full bg-muted/10 dark:bg-muted/20 overflow-hidden"
    >
      {!isCollapsed && (
        <div className="flex items-center justify-center gap-2 px-2 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <UserAvatarMenu />

            <Popover open={newChatOpen} onOpenChange={setNewChatOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-9 w-9",
                  )}
                >
                  <SquarePen size={20} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={8}
                className="w-auto p-0 border-0 bg-transparent shadow-none"
              >
                <NewChatDialog
                  open={newChatOpen}
                  onOpenChange={setNewChatOpen}
                  onConversationCreated={(id) => {
                    setNewChatOpen(false);
                    onNewChatCreated?.(id);
                  }}
                />
              </PopoverContent>
            </Popover>

            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={onPendingChats}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "h-9 w-9 relative",
                    )}
                  >
                    <Mailbox size={23} />
                    {pendingRequestCount > 0 && (
                      <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border-2 border-background rounded-full" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Pending Chats {pendingRequestCount > 0 && `(${pendingRequestCount})`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Popover open={newGroupOpen} onOpenChange={setNewGroupOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-9 w-9",
                  )}
                >
                  <Users size={20} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={8}
                className="w-auto p-0 border-0 bg-transparent shadow-none ml-2"
              >
                <NewGroupDialog
                  open={newGroupOpen}
                  onOpenChange={setNewGroupOpen}
                  onGroupCreated={(id) => {
                    setNewGroupOpen(false);
                    onGroupCreated?.(id);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-3 px-2 pt-4 pb-2 shrink-0">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <UserAvatarMenu />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                Profile
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover open={!newChatOpen ? undefined : newChatOpen} onOpenChange={setNewChatOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "h-9 w-9 flex items-center justify-center",
                )}
              >
                <SquarePen size={20} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={8}
              className="w-auto p-0 border-0 bg-transparent shadow-none ml-2"
            >
              <NewChatDialog
                open={newChatOpen}
                onOpenChange={setNewChatOpen}
                onConversationCreated={(id) => {
                  setNewChatOpen(false);
                  onNewChatCreated?.(id);
                }}
              />
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={onPendingChats}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-9 w-9 flex items-center justify-center relative",
                  )}
                >
                  <Mailbox size={23} />
                  {pendingRequestCount > 0 && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border-2 border-background rounded-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Pending Chats {pendingRequestCount > 0 && `(${pendingRequestCount})`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover open={newGroupOpen} onOpenChange={setNewGroupOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "h-9 w-9 flex items-center justify-center",
                )}
              >
                <Users size={20} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={8}
              className="w-auto p-0 border-0 bg-transparent shadow-none ml-2"
            >
              <NewGroupDialog
                open={newGroupOpen}
                onOpenChange={setNewGroupOpen}
                onGroupCreated={(id) => {
                  setNewGroupOpen(false);
                  onGroupCreated?.(id);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto p-2 grid gap-1 content-start group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:items-center group-[[data-collapsed=true]]:px-2 group-[[data-collapsed=true]]:gap-3">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, index) => (
            isCollapsed ? (
              <div key={index} className="flex items-center justify-center">
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            ) : (
              <div key={index} className="flex items-center gap-3 px-2 py-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            )
          ))
        ) : (
          chats.map((chat, index) =>
          isCollapsed ? (
            <TooltipProvider key={chat.id}>
              <Tooltip key={chat.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => onChatSelect?.(chat.id)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-9 w-9 relative flex items-center justify-center rounded-full p-0",
                      )}
                    >
                      {chat.isGroup ? (
                        <div className={cn(
                          "h-9 w-9 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center shrink-0 relative",
                          chat.variant === "secondary" && "ring-2 ring-black dark:ring-white"
                        )}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            {(() => {
                              const iconName = chat.iconName || 'Users'
                              const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
                              return IconComponent ? <IconComponent size={18} className="text-black dark:text-white" /> : <Users size={18} className="text-black dark:text-white" />
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "h-9 w-9 rounded-full",
                          chat.variant === "secondary" && "ring-2 ring-black dark:ring-white"
                        )}>
                        <Avatar className="h-9 w-9">
                          <ThemeAvatarImage
                              avatarUrl={chat.avatar}
                              alt={chat.name}
                          />
                        </Avatar>
                        </div>
                      )}
                      {/* Unread notification indicator */}
                      {chat.hasUnread && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border-2 border-background rounded-full" />
                      )}
                      <span className="sr-only">{chat.name}</span>
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="flex items-center gap-4"
                >
                  {chat.name}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              key={chat.id}
              onClick={() => onChatSelect?.(chat.id)}
              className={cn(
                buttonVariants({ variant: chat.variant, size: "xl" }),
                chat.variant === "secondary" &&
                  "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white shrink",
                chat.variant === "ghost" && "border border-transparent",
                "justify-start gap-3 px-2 py-3",
              )}
            >
              <div className="relative shrink-0">
                {chat.isGroup ? (
                  <div className="h-9 w-9 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center shrink-0 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {(() => {
                        const iconName = chat.iconName || 'Users'
                        const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
                        return IconComponent ? <IconComponent size={18} className="text-black dark:text-white" /> : <Users size={18} className="text-black dark:text-white" />
                      })()}
                    </div>
                  </div>
                ) : (
                  <Avatar className="h-9 w-9">
                    <ThemeAvatarImage
                      avatarUrl={chat.avatar}
                      alt={chat.name}
                    />
                  </Avatar>
                )}
                {/* Unread notification indicator */}
                {chat.hasUnread && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border-2 border-background rounded-full" />
                )}
              </div>
              <div className="flex flex-col max-w-28 text-left">
                <div className="flex items-center gap-1">
                  <span className="truncate">{chat.name}</span>
                  {chat.isGroup && chat.participantCount && (
                    <span className="text-xs text-black/70 dark:text-white/70 shrink-0">
                      ({chat.participantCount})
                    </span>
                  )}
                </div>
                {chat.messages.length > 0 && (
                  <span className="text-black dark:text-white text-xs truncate">
                    {chat.messages[chat.messages.length - 1].name.split(" ")[0]}
                    :{" "}
                    {chat.messages[chat.messages.length - 1].isLoading
                      ? "Typing..."
                      : chat.messages[chat.messages.length - 1].message}
                  </span>
                )}
              </div>
            </button>
          )
        ))}
      </nav>
    </div>
  );
}
