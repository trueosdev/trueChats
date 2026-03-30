"use client";

import "@livekit/components-styles";
import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";
import { cn } from "@/lib/utils";

function AudioOnlyView() {
  const { remoteUser, hangUp } = useCall();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="text-lg font-medium">{remoteUser?.name}</p>
      <p className="tabular-nums text-muted-foreground">
        {mm}:{ss}
      </p>
      <RoomAudioRenderer />
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
        className="mt-4 h-14 w-14 rounded-full bg-red-600 text-white hover:bg-red-700 hover:text-white"
        onClick={hangUp}
      >
        <PhoneOff className="h-6 w-6" />
      </Button>
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
  const { hangUp } = useCall();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <div className="flex items-center justify-center gap-2 py-3">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: false,
            leave: false,
            chat: false,
          }}
        />
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
  const { callState, callType, livekitToken, livekitUrl, roomName, hangUp, remoteUser } =
    useCall();

  if (
    (callState !== "connected" && callState !== "outgoing") ||
    !livekitToken ||
    !roomName
  )
    return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        video={callType === "video"}
        audio={true}
        onDisconnected={hangUp}
        className="flex h-full flex-col"
      >
        {callState === "outgoing" ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-lg font-medium">
              Calling {remoteUser?.name}...
            </p>
            <p className="text-sm text-muted-foreground">
              {callType === "video" ? "Video" : "Voice"} call
            </p>
            <RoomAudioRenderer />
            <Button
              size="icon"
              variant="ghost"
              className="mt-6 h-14 w-14 rounded-full bg-red-600 text-white hover:bg-red-700 hover:text-white"
              onClick={hangUp}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        ) : callType === "video" ? (
          <VideoView />
        ) : (
          <AudioOnlyView />
        )}
      </LiveKitRoom>
    </div>
  );
}
