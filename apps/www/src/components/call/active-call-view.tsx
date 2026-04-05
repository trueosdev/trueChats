"use client";

import "@livekit/components-styles";
import "@/app/livekit-overrides.css";
import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  useTracks,
  useRemoteParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import {
  CallAudioMixerProvider,
  MixerParticipantTile,
  PerParticipantRoomAudioRenderer,
  RemoteParticipantMixerBubble,
} from "@/components/call/call-audio-mixer";
import { LiveKitLucideControlBar } from "@/components/call/livekit-lucide-control-bar";
import { Track } from "livekit-client";
import { PhoneOff, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";
import { CallSpeakingAvatar } from "./call-speaking-avatar";
import { LIVEKIT_ROOM_MEDIA_DEFAULTS } from "./livekit-room-media-defaults";
import { EnsureDefaultMediaDevices } from "./ensure-default-media-devices";
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

function AudioOnlyView() {
  const { remoteUser, hangUp, toggleMinimize } = useCall();
  const { user } = useAuth();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const hasRemote = remoteParticipants.length > 0;

  const localName =
    user?.user_metadata?.fullname ||
    user?.user_metadata?.username ||
    "You";
  const localAvatar = getAvatarUrl(user?.user_metadata?.avatar_url);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-black/90 to-black">
      <div className="flex items-center gap-10">
        <CallSpeakingAvatar
          participant={localParticipant}
          avatarUrl={localAvatar}
          alt={localName}
          size="compact"
          showName={localName}
        />
        {hasRemote ? (
          <RemoteParticipantMixerBubble
            identity={remoteParticipants[0]!.identity}
            displayName={remoteUser?.name || remoteParticipants[0]!.identity}
          >
            <CallSpeakingAvatar
              participant={remoteParticipants[0]!}
              avatarUrl={remoteUser?.avatar ?? null}
              alt={remoteUser?.name || remoteParticipants[0]!.identity}
              size="compact"
              showName={remoteUser?.name || remoteParticipants[0]!.identity}
            />
          </RemoteParticipantMixerBubble>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 rounded-full ring-1 ring-white/10 bg-white/5 flex items-center justify-center">
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

      <div className="livekit-lucide-call-controls livekit-lucide-call-controls--dm flex items-center gap-3 mt-4 overflow-visible">
        <LiveKitLucideControlBar microphone camera={false} screenShare={false} />
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
    <div className="flex h-full flex-col bg-black" data-call-video-tiles="portrait-34">
      <div className="flex-1 min-h-0">
        <GridLayout tracks={tracks}>
          <MixerParticipantTile />
        </GridLayout>
      </div>
      <div className="livekit-lucide-call-controls livekit-lucide-call-controls--dm flex items-center justify-center gap-3 overflow-visible py-4 bg-black/80 backdrop-blur-sm">
        <LiveKitLucideControlBar />
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
        options={LIVEKIT_ROOM_MEDIA_DEFAULTS}
        onDisconnected={hangUp}
        data-lk-theme="default"
        className="flex h-full flex-col"
      >
        <EnsureDefaultMediaDevices video={callType === "video"} />
        <CallAudioMixerProvider>
          {callType === "video" ? <VideoView /> : <AudioOnlyView />}
          <PerParticipantRoomAudioRenderer />
        </CallAudioMixerProvider>
      </LiveKitRoom>
    </div>
  );
}
