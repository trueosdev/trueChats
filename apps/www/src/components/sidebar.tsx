"use client";

import React, { useState } from "react";
import { SquarePen, Mailbox, ArrowDownToLine, Apple, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { RAIL_WIDTH } from "@/lib/layout-constants";
import { ThemeAvatarImage } from "./ui/theme-avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "./ui/avatar";
import { Message } from "@/app/data";
import { UserAvatarMenu } from "./user-avatar-menu";
import { Skeleton } from "./ui/skeleton";
import { NewChatDialog } from "./new-chat-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DESKTOP_RELEASE_MAC =
  "https://github.com/trueosdev/trueChat/releases/download/0.1.0/trueChats-0.1.0-mac-arm64.dmg";
const DESKTOP_RELEASE_WINDOWS =
  "https://github.com/trueosdev/trueChat/releases/download/0.1.0/trueChats-0.1.0-win-x64.exe";

function DesktopDownloadMenu({ collapsed }: { collapsed: boolean }) {
  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "h-9 w-9",
                  collapsed && "flex items-center justify-center",
                )}
              >
                <ArrowDownToLine size={20} />
                <span className="sr-only">Download desktop app</span>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Download desktop app</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side={collapsed ? "right" : "bottom"}
          align="start"
          sideOffset={8}
          className="w-48"
        >
          <DropdownMenuItem asChild>
            <a
              href={DESKTOP_RELEASE_MAC}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-2"
            >
              <Apple className="h-4 w-4 shrink-0" aria-hidden />
              Mac
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={DESKTOP_RELEASE_WINDOWS}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-2"
            >
              <Monitor className="h-4 w-4 shrink-0" aria-hidden />
              Windows
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

interface SidebarProps {
  isCollapsed: boolean;
  chats: {
    id: string;
    name: string;
    messages: Message[];
    avatar: string;
    variant: "secondary" | "ghost";
    hasUnread?: boolean;
  }[];
  isMobile: boolean;
  onChatSelect?: (conversationId: string) => void;
  onNewChatCreated?: (conversationId: string) => void;
  onPendingChats?: () => void;
  pendingRequestCount?: number;
  loading?: boolean;
  customNav?: React.ReactNode;
}

export function Sidebar({ chats, isCollapsed, isMobile, onChatSelect, onNewChatCreated, onPendingChats, pendingRequestCount = 0, loading = false, customNav }: SidebarProps) {
  const [newChatOpen, setNewChatOpen] = useState(false);

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative group flex flex-col h-full bg-muted/10 dark:bg-muted/20 overflow-hidden"
      style={isCollapsed ? { width: RAIL_WIDTH, minWidth: RAIL_WIDTH } : undefined}
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
                      <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border border-background rounded-full" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Pending Chats {pendingRequestCount > 0 && `(${pendingRequestCount})`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DesktopDownloadMenu collapsed={false} />
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
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border border-background rounded-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Pending Chats {pendingRequestCount > 0 && `(${pendingRequestCount})`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DesktopDownloadMenu collapsed />
        </div>
      )}
      {customNav ? (
        <div className="flex-1 overflow-y-auto">{customNav}</div>
      ) : (
      <nav className="flex-1 overflow-y-auto p-2 grid gap-1 content-start group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:items-center group-[[data-collapsed=true]]:px-2 group-[[data-collapsed=true]]:gap-3">
        {loading ? (
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
          chats.map((chat) =>
          isCollapsed ? (
            <TooltipProvider key={chat.id}>
              <Tooltip key={chat.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => onChatSelect?.(chat.id)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-9 w-9 relative flex items-center justify-center rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                        chat.variant === "secondary" && "focus-visible:bg-black/10 dark:focus-visible:bg-white/10",
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-full transition-colors",
                        chat.variant === "secondary" && "bg-black/10 dark:bg-white/10"
                      )}>
                        <Avatar className="h-9 w-9">
                          <ThemeAvatarImage
                            avatarUrl={chat.avatar}
                            alt={chat.name}
                          />
                        </Avatar>
                      </div>
                      {chat.hasUnread && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border border-background rounded-full" />
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
                buttonVariants({ variant: "ghost", size: "xl" }),
                chat.variant === "secondary" &&
                  "bg-black/[0.08] dark:bg-white/[0.08] hover:bg-black/[0.12] dark:hover:bg-white/[0.12]",
                "justify-start gap-3 px-2 py-3 rounded-xl",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                chat.variant === "secondary"
                  ? "focus-visible:bg-black/[0.12] dark:focus-visible:bg-white/[0.12]"
                  : "focus-visible:bg-accent",
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <ThemeAvatarImage
                    avatarUrl={chat.avatar}
                    alt={chat.name}
                  />
                </Avatar>
                {chat.hasUnread && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border border-background rounded-full" />
                )}
              </div>
              <div className="flex flex-col max-w-28 text-left">
                <span className="truncate">{chat.name}</span>
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
      )}
    </div>
  );
}
