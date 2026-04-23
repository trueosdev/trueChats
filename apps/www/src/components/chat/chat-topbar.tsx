"use client";

import React from "react";
import { Avatar } from "../ui/avatar";
import { ThemeAvatarImage } from "../ui/theme-avatar";
import { ConversationWithUser } from "@/app/data";
import { Phone, Video, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { ExpandableChatHeader } from "@shadcn-chat/ui";
import { useCall } from "@/components/call/call-provider";
import useChatStore from "@/hooks/useChatStore";

interface ChatTopbarProps {
  conversation: ConversationWithUser;
  onShowSearch?: () => void;
}

export default function ChatTopbar({ conversation, onShowSearch }: ChatTopbarProps) {
  const { startCall, callState } = useCall();
  const onlineUserIds = useChatStore((state) => state.onlineUserIds);

  const otherUser = conversation.other_user;
  if (!otherUser) return null;

  const isOnline = onlineUserIds.has(otherUser.id);

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
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border border-background rounded-full bg-green-500" />
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
