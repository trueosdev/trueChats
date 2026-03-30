"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "../ui/avatar";
import { ThemeAvatarImage } from "../ui/theme-avatar";
import { ConversationWithUser } from "@/app/data";
import { Info, Phone, Video, Users, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import * as LucideIcons from 'lucide-react';
import { buttonVariants } from "../ui/button";
import { ExpandableChatHeader } from "@shadcn-chat/ui";
import { subscribeToPresence, type UserPresence } from "@/lib/services/presence";
import { useAuth } from "@/hooks/useAuth";
import { useColorTheme } from "@/hooks/useColorTheme";
import { useCall } from "@/components/call/call-provider";

interface ChatTopbarProps {
  conversation: ConversationWithUser;
  onShowMembers?: () => void;
  onShowSearch?: () => void;
}

export const TopbarIcons = [{ icon: Phone }, { icon: Video }, { icon: Info }];

export default function ChatTopbar({ conversation, onShowMembers, onShowSearch }: ChatTopbarProps) {
  const { user } = useAuth();
  const { colorTheme } = useColorTheme();
  const { startCall, callState } = useCall();
  const isBlackWhite = colorTheme.name === "Black & White";
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user || conversation.is_group) return;

    const otherUser = conversation.other_user;
    if (!otherUser) return;

    // Subscribe to presence (tracks our presence and listens to others)
    const channel = subscribeToPresence(user.id, (presences) => {
      // Check if the other user is online
      const userPresence = presences[otherUser.id];
      setIsOnline(!!userPresence && userPresence.length > 0);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, conversation]);

  if (conversation.is_group) {
    const iconName = conversation.icon_name || 'Users'
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>
    const GroupIcon = IconComponent || Users
    
    return (
      <ExpandableChatHeader className="px-2 py-3 sm:px-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center shrink-0 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <GroupIcon size={18} className="text-black dark:text-white" />
            </div>
          </div>
          {onShowSearch && (
            <button
              onClick={onShowSearch}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8"
              )}
              title="Search messages"
            >
              <Search size={18} />
            </button>
          )}
          <div className="flex flex-col text-left flex-1">
            <span className="font-medium">{conversation.name || "Unnamed Group"}</span>
            <span className="text-xs text-muted-foreground">
              {conversation.participant_count || 0} members
            </span>
          </div>
          {onShowMembers && (
            <button
              onClick={onShowMembers}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8"
              )}
              title="Group info"
            >
              <Info size={18} />
            </button>
          )}
        </div>
      </ExpandableChatHeader>
    );
  }

  const otherUser = conversation.other_user;
  if (!otherUser) return null;

  const displayName = otherUser.fullname || otherUser.username || otherUser.email || "Unknown";

  return (
    <ExpandableChatHeader className="px-2 py-3 sm:px-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <Avatar className="h-9 w-9">
            <ThemeAvatarImage
              avatarUrl={otherUser.avatar_url}
              alt={displayName}
            />
          </Avatar>
          {/* Online status indicator */}
          {isOnline && (
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-background rounded-full ${
              isBlackWhite ? "bg-foreground" : "bg-green-500"
            }`} />
          )}
        </div>
        <div className="flex flex-col text-left">
          <span className="font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onShowSearch && (
          <button
            onClick={onShowSearch}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-8 w-8"
            )}
            title="Search messages"
          >
            <Search size={18} />
          </button>
        )}
        <button
          onClick={() => {
            if (callState !== "idle") return;
            startCall(
              conversation.id,
              otherUser.id,
              otherUser.fullname || otherUser.username || otherUser.email || "User",
              "audio",
            );
          }}
          disabled={callState !== "idle"}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-8 w-8",
            callState !== "idle" && "opacity-40 cursor-not-allowed",
          )}
          title="Voice call"
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => {
            if (callState !== "idle") return;
            startCall(
              conversation.id,
              otherUser.id,
              otherUser.fullname || otherUser.username || otherUser.email || "User",
              "video",
            );
          }}
          disabled={callState !== "idle"}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-8 w-8",
            callState !== "idle" && "opacity-40 cursor-not-allowed",
          )}
          title="Video call"
        >
          <Video size={18} />
        </button>
      </div>
    </ExpandableChatHeader>
  );
}
