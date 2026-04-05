"use client";

import type { ReactNode } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import {
  CallAudioMixerProvider,
  PerParticipantRoomAudioRenderer,
} from "@/components/call/call-audio-mixer";
import { LIVEKIT_ROOM_MEDIA_DEFAULTS } from "@/components/call/livekit-room-media-defaults";
import { EnsureDefaultMediaDevices } from "@/components/call/ensure-default-media-devices";
import { useThreadCall } from "@/components/call/thread-call-provider";
import { ThreadMinimizedPillContent } from "@/components/call/minimized-thread-call-pill";

/**
 * Keeps one LiveKit connection for thread voice while navigating the app.
 * Call UI in thread-chat mounts as children of this room (no second connection on minimize).
 */
export function ThreadCallLiveKitShell({ children }: { children: ReactNode }) {
  const {
    threadCallState,
    livekitToken,
    livekitUrl,
    roomName,
    leaveThreadCall,
    isMinimized,
  } = useThreadCall();

  const connected =
    threadCallState === "connected" && !!livekitToken && !!roomName;

  if (!connected) {
    return <>{children}</>;
  }

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={true}
      audio={true}
      video={false}
      options={LIVEKIT_ROOM_MEDIA_DEFAULTS}
      onDisconnected={leaveThreadCall}
      data-lk-theme="default"
      className="contents"
    >
      <EnsureDefaultMediaDevices video={false} />
      <CallAudioMixerProvider>
        <PerParticipantRoomAudioRenderer />
        {children}
        {isMinimized ? <ThreadMinimizedPillContent /> : null}
      </CallAudioMixerProvider>
    </LiveKitRoom>
  );
}
