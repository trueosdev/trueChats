"use client";

import "@livekit/components-styles";
import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { PhoneOff, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import { useCall } from "./call-provider";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarUrl } from "@/lib/utils";

function CallTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="tabular-nums text-sm text-white/60">
      {mm}:{ss}
    </span>
  );
}

function ParticipantBubble({
  avatarUrl,
  name,
  isSpeaking,
}: {
  avatarUrl: string | null;
  name: string;
  isSpeaking?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar
          className={`h-24 w-24 ring-2 transition-all duration-300 ${
            isSpeaking ? "ring-green-400 ring-[3px]" : "ring-white/20"
          }`}
        >
          <ThemeAvatarImage avatarUrl={avatarUrl} alt={name} />
        </Avatar>
        {isSpeaking && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <div className="flex items-end gap-[3px] h-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-green-400"
                  style={{
                    animation: `waveform 1.2s ease-in-out ${i * 0.1}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-white/80">{name}</p>
    </div>
  );
}

function AudioOnlyView() {
  const { remoteUser, hangUp, toggleMinimize } = useCall();
  const { user } = useAuth();
  const remoteParticipants = useRemoteParticipants();
  const hasRemote = remoteParticipants.length > 0;

  const localName =
    user?.user_metadata?.fullname ||
    user?.user_metadata?.username ||
    "You";
  const localAvatar = getAvatarUrl(user?.user_metadata?.avatar_url);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-black/90 to-black">
      <div className="flex items-center gap-8">
        <ParticipantBubble
          avatarUrl={localAvatar}
          name={localName}
          isSpeaking={false}
        />
        {hasRemote ? (
          <ParticipantBubble
            avatarUrl={remoteUser?.avatar ?? null}
            name={remoteUser?.name || ""}
            isSpeaking={remoteParticipants[0]?.isSpeaking}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 rounded-full ring-2 ring-white/10 bg-white/5 flex items-center justify-center">
              <div className="flex items-end gap-[3px] h-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-white/20"
                    style={{
                      animation: `waveform 1.8s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-white/40">Waiting for {remoteUser?.name}...</p>
          </div>
        )}
      </div>

      <CallTimer />

      <RoomAudioRenderer />

      <div className="flex items-center gap-3 mt-4">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: false,
            screenShare: false,
            leave: false,
            chat: false,
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
          onClick={toggleMinimize}
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-12 w-12 rounded-full bg-red-600 text-white hover:bg-red-700 hover:text-white"
          onClick={hangUp}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function VideoView() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const { hangUp, toggleMinimize } = useCall();

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex-1 min-h-0">
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <div className="flex items-center justify-center gap-3 py-4 bg-black/80 backdrop-blur-sm">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: true,
            leave: false,
            chat: false,
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
          onClick={toggleMinimize}
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full bg-red-600 text-white hover:bg-red-700 hover:text-white"
          onClick={hangUp}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export function ActiveCallView() {
  const { callState, callType, livekitToken, livekitUrl, roomName, hangUp, isMinimized } =
    useCall();

  if (callState !== "connected" || !livekitToken || !roomName) return null;
  if (isMinimized) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black animate-in fade-in duration-200">
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        video={callType === "video"}
        audio={true}
        onDisconnected={hangUp}
        className="flex h-full flex-col"
      >
        {callType === "video" ? <VideoView /> : <AudioOnlyView />}
      </LiveKitRoom>
    </div>
  );
}
