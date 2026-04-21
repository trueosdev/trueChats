"use client";

import { useMemo, type ReactNode } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import {
  CallAudioMixerProvider,
  PerParticipantRoomAudioRenderer,
} from "@/components/call/call-audio-mixer";
import { buildRoomMediaDefaults } from "@/components/call/livekit-room-media-defaults";
import { getAudioSettingsSnapshot } from "@/hooks/useAudioSettings";
import { LiveKitUiFeatureProvider } from "@/components/call/livekit-feature-context";
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

  // Snapshot the user's audio settings once per mount. Because we only mount
  // when `connected` is true (see early return below), each new call pulls
  // fresh settings and mid-call toggles don't thrash the LiveKit connection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const roomOptions = useMemo(() => buildRoomMediaDefaults(getAudioSettingsSnapshot()), [connected]);

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
      options={roomOptions}
      onDisconnected={leaveThreadCall}
      data-lk-theme="default"
      className="contents"
    >
      <LiveKitUiFeatureProvider>
        <EnsureDefaultMediaDevices video={false} />
        <CallAudioMixerProvider>
          <PerParticipantRoomAudioRenderer />
          {children}
          {isMinimized ? <ThreadMinimizedPillContent /> : null}
        </CallAudioMixerProvider>
      </LiveKitUiFeatureProvider>
    </LiveKitRoom>
  );
}
