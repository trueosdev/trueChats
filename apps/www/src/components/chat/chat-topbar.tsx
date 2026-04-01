"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "../ui/avatar";
import { ThemeAvatarImage } from "../ui/theme-avatar";
import { ConversationWithUser } from "@/app/data";
import { Phone, Video, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { ExpandableChatHeader } from "@shadcn-chat/ui";
import { subscribeToPresence } from "@/lib/services/presence";
import { useAuth } from "@/hooks/useAuth";
import { useColorTheme } from "@/hooks/useColorTheme";
import { useCall } from "@/components/call/call-provider";

interface ChatTopbarProps {
  conversation: ConversationWithUser;
  onShowSearch?: () => void;
}

export default function ChatTopbar({ conversation, onShowSearch }: ChatTopbarProps) {
  const { user } = useAuth();
  const { colorTheme } = useColorTheme();
  const { startCall, callState } = useCall();
  const isBlackWhite = colorTheme.name === "Black & White";
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user) return;

    const otherUser = conversation.other_user;
    if (!otherUser) return;

    const channel = subscribeToPresence(user.id, (presences) => {
      const userPresence = presences[otherUser.id];
      setIsOnline(!!userPresence && userPresence.length > 0);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user, conversation]);

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
          {isOnline && (
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border border-background rounded-full ${
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
