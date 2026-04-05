"use client";

import { useEffect, useState } from "react";
import { PhoneOff, Maximize2, LineSquiggle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThreadCall } from "./thread-call-provider";
import useChatStore from "@/hooks/useChatStore";
import { MinimizedCallVideoThumb } from "./minimized-call-video-thumb";
import { DraggableMinimizedPillFrame } from "./draggable-minimized-pill-frame";

function PillTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="tabular-nums text-xs font-medium text-foreground">
      {mm}:{ss}
    </span>
  );
}

/** Must render under the thread call LiveKitRoom (see ThreadCallLiveKitShell). */
export function ThreadMinimizedPillContent() {
  const { leaveThreadCall, threadName, loomId, threadId } = useThreadCall();
  const setViewMode = useChatStore((s) => s.setViewMode);
  const setSelectedLoomId = useChatStore((s) => s.setSelectedLoomId);
  const setSelectedThreadId = useChatStore((s) => s.setSelectedThreadId);

  const navigateToThread = () => {
    if (loomId) {
      setViewMode("looms");
      setSelectedLoomId(loomId);
      if (threadId) {
        setSelectedThreadId(threadId);
      }
    }
  };

  return (
    <DraggableMinimizedPillFrame>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-background backdrop-blur-xl pl-2 pr-1.5 py-1.5 shadow-2xl">
        <MinimizedCallVideoThumb />
        <button
          onClick={navigateToThread}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-background">
            <LineSquiggle className="h-3.5 w-3.5 text-foreground" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 mr-1">
            <span className="max-w-[100px] truncate text-xs font-medium text-foreground">
              {threadName}
            </span>
            <PillTimer />
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full border border-transparent bg-background text-foreground/80 hover:border-border hover:bg-muted hover:text-foreground"
            onClick={navigateToThread}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full bg-red-600/80 text-white hover:bg-red-600 hover:text-white"
            onClick={leaveThreadCall}
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </DraggableMinimizedPillFrame>
  );
}

/** @deprecated Pill is rendered by ThreadCallLiveKitShell; kept for any stray imports. */
export function MinimizedThreadCallPill() {
  return null;
}
