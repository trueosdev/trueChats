"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import {
  CallAudioMixerProvider,
  PerParticipantRoomAudioRenderer,
} from "@/components/call/call-audio-mixer";
import { PhoneOff, Maximize2, LineSquiggle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThreadCall } from "./thread-call-provider";
import useChatStore from "@/hooks/useChatStore";
import { LIVEKIT_ROOM_MEDIA_DEFAULTS } from "./livekit-room-media-defaults";
import { EnsureDefaultMediaDevices } from "./ensure-default-media-devices";

function PillTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="tabular-nums text-xs text-green-400 font-medium">
      {mm}:{ss}
    </span>
  );
}

function PillControls() {
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
    <div className="fixed bottom-6 right-6 z-[201] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/90 backdrop-blur-xl pl-2 pr-1.5 py-1.5 shadow-2xl">
        <button
          onClick={navigateToThread}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="h-7 w-7 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
            <LineSquiggle className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 mr-1">
            <span className="text-xs font-medium text-white truncate max-w-[100px]">
              {threadName}
            </span>
            <PillTimer />
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full text-white/70 hover:text-white hover:bg-white/10"
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
    </div>
  );
}

export function MinimizedThreadCallPill() {
  const {
    threadCallState,
    isMinimized,
    livekitToken,
    livekitUrl,
    roomName,
    leaveThreadCall,
  } = useThreadCall();

  if (
    threadCallState !== "connected" ||
    !isMinimized ||
    !livekitToken ||
    !roomName
  ) {
    return null;
  }

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={true}
      video={false}
      audio={true}
      options={LIVEKIT_ROOM_MEDIA_DEFAULTS}
      onDisconnected={leaveThreadCall}
    >
      <EnsureDefaultMediaDevices video={false} />
      <CallAudioMixerProvider>
        <PerParticipantRoomAudioRenderer />
        <PillControls />
      </CallAudioMixerProvider>
    </LiveKitRoom>
  );
}
