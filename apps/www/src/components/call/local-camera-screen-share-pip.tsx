"use client";

import { useMemo } from "react";
import { useTracks } from "@livekit/components-react";
import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { Track } from "livekit-client";
import { MixerParticipantTile } from "@/components/call/call-audio-mixer";
import { cn } from "@/lib/utils";

function pickLocalLiveCamera(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder | null {
  return (
    tracks.find(
      (t) =>
        isTrackReference(t) &&
        t.source === Track.Source.Camera &&
        t.participant.isLocal &&
        t.publication.isSubscribed &&
        !!t.publication.track &&
        !t.publication.isMuted,
    ) ?? null
  );
}

/**
 * When the main stage is a screen share, local camera video would otherwise never appear
 * (strip uses avatars only). Renders a small self-view in the corner.
 */
export function LocalCameraScreenSharePip({
  mainTrack,
  mixerMenuContentClassName,
  className,
}: {
  mainTrack: TrackReferenceOrPlaceholder | null;
  mixerMenuContentClassName?: string;
  className?: string;
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const localCam = useMemo(() => pickLocalLiveCamera(tracks), [tracks]);

  const mainIsLiveShare =
    mainTrack &&
    isTrackReference(mainTrack) &&
    mainTrack.source === Track.Source.ScreenShare &&
    !mainTrack.publication.isMuted;

  if (!mainIsLiveShare || !localCam || !isTrackReference(localCam)) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-20",
        "h-[min(22vh,13rem)] w-[min(38vw,12rem)] min-h-[5rem] min-w-[7rem]",
        "overflow-hidden rounded-xl border border-white/25 bg-background shadow-[0_8px_28px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <MixerParticipantTile
        trackRef={localCam}
        className="pointer-events-auto !h-full !min-h-0 !w-full !min-w-0"
        mixerMenuContentClassName={mixerMenuContentClassName}
      />
    </div>
  );
}
