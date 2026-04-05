"use client";

import "@livekit/components-styles";
import "@/app/livekit-overrides.css";
import { useEffect, useState, useMemo } from "react";
import {
  LiveKitRoom,
  useTracks,
  useRemoteParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { isTrackReference } from "@livekit/components-core";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import {
  CallAudioMixerProvider,
  MixerParticipantTile,
  PerParticipantRoomAudioRenderer,
  RemoteParticipantMixerBubble,
} from "@/components/call/call-audio-mixer";
import { ConferenceParticipantStrip } from "@/components/call/conference-participant-strip";
import { LiveKitLucideControlBar } from "@/components/call/livekit-lucide-control-bar";
import { Track } from "livekit-client";
import { PhoneOff, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";
import { CallSpeakingAvatar } from "./call-speaking-avatar";
import { LIVEKIT_ROOM_MEDIA_DEFAULTS } from "./livekit-room-media-defaults";
import { LiveKitUiFeatureProvider } from "./livekit-feature-context";
import { EnsureDefaultMediaDevices } from "./ensure-default-media-devices";
import { DmMinimizedCallPillInner } from "./minimized-call-pill";
import { LocalCameraScreenSharePip } from "./local-camera-screen-share-pip";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarUrl } from "@/lib/utils";

function pickDmMainVideoTrack(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder | null {
  const refs = tracks.filter(isTrackReference);
  const liveScreen = (isLocal: boolean) =>
    refs.find(
      (t) =>
        t.source === Track.Source.ScreenShare &&
        t.participant.isLocal === isLocal &&
        !t.publication.isMuted,
    );
  const liveCam = (isLocal: boolean) =>
    refs.find(
      (t) =>
        t.source === Track.Source.Camera &&
        t.participant.isLocal === isLocal &&
        t.publication.isSubscribed &&
        !!t.publication.track &&
        !t.publication.isMuted,
    );
  return liveScreen(false) ?? liveCam(false) ?? liveScreen(true) ?? liveCam(true) ?? null;
}

function CallTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="tabular-nums text-sm text-muted-foreground">
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
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-background">
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
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-background">
              <div className="flex items-end gap-[3px] h-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-foreground/25"
                    style={{
                      animation: `waveform 1.8s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Waiting for {remoteUser?.name}...</p>
          </div>
        )}
      </div>

      <CallTimer />

      <div className="livekit-lucide-call-controls livekit-lucide-call-controls--dm flex items-center gap-3 mt-4 overflow-visible">
        <LiveKitLucideControlBar microphone camera={false} screenShare={false} />
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full border border-white/15 bg-background text-foreground hover:bg-muted hover:text-foreground"
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

  const mainTrack = useMemo(() => pickDmMainVideoTrack(tracks), [tracks]);
  const hasMainVideo = mainTrack != null;

  return (
    <div className="flex h-full flex-col bg-background">
      {hasMainVideo ? (
        <div className="thread-call-main-stage relative min-h-0 flex-1 overflow-hidden bg-background">
          <MixerParticipantTile
            trackRef={mainTrack}
            className="!h-full !min-h-0 !w-full !min-w-0"
            mixerMenuContentClassName="z-[600]"
          />
          <LocalCameraScreenSharePip
            mainTrack={mainTrack}
            mixerMenuContentClassName="z-[600]"
          />
        </div>
      ) : null}
      <ConferenceParticipantStrip
        centered={!hasMainVideo}
        className={
          hasMainVideo ? "border-white/15 bg-background/70" : undefined
        }
        mixerMenuContentClassName="z-[600]"
      />
      <div className="livekit-lucide-call-controls livekit-lucide-call-controls--dm flex shrink-0 items-center justify-center gap-3 overflow-visible py-4 bg-background/85 backdrop-blur-sm">
        <LiveKitLucideControlBar />
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full border border-white/15 bg-background text-foreground hover:bg-muted hover:text-foreground"
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

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={true}
      video={callType === "video"}
      audio={true}
      options={LIVEKIT_ROOM_MEDIA_DEFAULTS}
      onDisconnected={hangUp}
      data-lk-theme="default"
      className={
        isMinimized
          ? "contents"
          : "fixed bottom-0 right-0 top-0 z-[200] flex h-full flex-col bg-background left-[var(--dm-call-inset-left,0px)] animate-in fade-in duration-200"
      }
    >
      <LiveKitUiFeatureProvider>
        <EnsureDefaultMediaDevices video={callType === "video"} />
        <CallAudioMixerProvider>
          <PerParticipantRoomAudioRenderer />
          {isMinimized ? (
            <DmMinimizedCallPillInner />
          ) : callType === "video" ? (
            <VideoView />
          ) : (
            <AudioOnlyView />
          )}
        </CallAudioMixerProvider>
      </LiveKitUiFeatureProvider>
    </LiveKitRoom>
  );
}
