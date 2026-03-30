"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";
import { cn } from "@/lib/utils";

export function IncomingCallOverlay() {
  const { callState, callType, remoteUser, acceptCall, rejectCall } = useCall();

  if (callState !== "incoming" || !remoteUser) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "flex flex-col items-center gap-6 rounded-2xl border border-border bg-background p-8 shadow-2xl",
          "w-[min(22rem,90vw)] animate-in fade-in zoom-in-95 duration-200",
        )}
      >
        <Avatar className="h-20 w-20">
          <ThemeAvatarImage
            avatarUrl={remoteUser.avatar}
            alt={remoteUser.name}
          />
        </Avatar>

        <div className="text-center">
          <p className="text-lg font-semibold">{remoteUser.name}</p>
          <p className="text-sm text-muted-foreground">
            Incoming {callType === "video" ? "video" : "voice"} call...
          </p>
        </div>

        <div className="flex items-center gap-8">
          <Button
            size="icon"
            variant="ghost"
            className="h-14 w-14 rounded-full bg-red-600 text-white hover:bg-red-700 hover:text-white"
            onClick={rejectCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-14 w-14 rounded-full bg-green-600 text-white hover:bg-green-700 hover:text-white"
            onClick={acceptCall}
          >
            {callType === "video" ? (
              <Video className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
