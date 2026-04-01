"use client";

import { Phone, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";

export function IncomingCallOverlay() {
  const { callState, remoteUser, joinCall, dismissIncoming } = useCall();

  if (callState !== "incoming" || !remoteUser) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-background/95 backdrop-blur-xl px-4 py-3 shadow-2xl min-w-[18rem]">
        <div className="relative">
          <Avatar className="h-10 w-10 shrink-0">
            <ThemeAvatarImage
              avatarUrl={remoteUser.avatar}
              alt={remoteUser.name}
            />
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-background" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{remoteUser.name}</p>
          <p className="text-xs text-muted-foreground">Started a call</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={dismissIncoming}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-full bg-green-600 text-white hover:bg-green-700 px-3 gap-1.5 text-xs font-medium"
            onClick={joinCall}
          >
            <Phone className="h-3.5 w-3.5" />
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
