"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";

export function IncomingCallOverlay() {
  const { callState, callType, remoteUser, acceptCall, rejectCall } = useCall();

  if (callState !== "incoming" || !remoteUser) return null;

  return (
    <div className="fixed top-16 right-4 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-xl min-w-[16rem]">
        <Avatar className="h-10 w-10 shrink-0">
          <ThemeAvatarImage
            avatarUrl={remoteUser.avatar}
            alt={remoteUser.name}
          />
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{remoteUser.name}</p>
          <p className="text-xs text-muted-foreground">
            {callType === "video" ? "Video" : "Voice"} call
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full bg-red-600 text-white hover:bg-red-700 hover:text-white"
            onClick={rejectCall}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full bg-green-600 text-white hover:bg-green-700 hover:text-white"
            onClick={acceptCall}
          >
            {callType === "video" ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
