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
      {/*
        Outer wrapper owns the pulsing ring so it can animate `box-shadow`
        independently of any shadows on the inner card.
      */}
      <div className="rounded-2xl incoming-call-pulse">
        <div className="flex min-w-[18rem] items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 backdrop-blur-xl">
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
            className="h-8 gap-1.5 rounded-full bg-green-600 px-3 text-xs font-medium text-white shadow-[0_0_5px_1px_rgba(22,163,74,0.45)] hover:bg-green-700 hover:shadow-[0_0_7px_1px_rgba(22,163,74,0.5)]"
            onClick={joinCall}
          >
            <Phone className="h-3.5 w-3.5" />
            Accept
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
