"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";
import { PhoneOff, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import { useCall } from "./call-provider";
import { RemoteMicWaveform } from "./remote-mic-waveform";

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
  const { hangUp, toggleMinimize, remoteUser } = useCall();
  let isMuted = false;
  try {
    const { localParticipant } = useLocalParticipant();
    isMuted = !localParticipant.isMicrophoneEnabled;
  } catch {
    // Outside LiveKitRoom context — show default unmuted state
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-[201] animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/90 backdrop-blur-xl pl-2 pr-1.5 py-1.5 shadow-2xl">
        <button
          onClick={toggleMinimize}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-7 w-7">
            <ThemeAvatarImage
              avatarUrl={remoteUser?.avatar}
              alt={remoteUser?.name || ""}
            />
          </Avatar>
          <div className="flex flex-col gap-0.5 min-w-0 mr-1">
            <span className="text-xs font-medium text-white truncate max-w-[100px]">
              {remoteUser?.name}
            </span>
            <div className="flex items-center gap-1.5">
              <RemoteMicWaveform
                barCount={4}
                className="h-3"
                gapPx={2}
                barClassName="w-[2px]"
              />
              <PillTimer />
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full text-white/70 hover:text-white hover:bg-white/10"
            onClick={toggleMinimize}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full bg-red-600/80 text-white hover:bg-red-600 hover:text-white"
            onClick={hangUp}
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MinimizedCallPill() {
  const { callState, isMinimized, livekitToken, livekitUrl, roomName, callType, hangUp } =
    useCall();

  if (callState !== "connected" || !isMinimized || !livekitToken || !roomName) {
    return null;
  }

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={true}
      video={false}
      audio={true}
      onDisconnected={hangUp}
    >
      <RoomAudioRenderer />
      <PillControls />
    </LiveKitRoom>
  );
}
