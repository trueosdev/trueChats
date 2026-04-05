"use client";

import {
  ParticipantContextIfNeeded,
  TrackRefContextIfNeeded,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { cn } from "@/lib/utils";
import { useLoudestVideoTrackRef } from "./use-loudest-video-track-ref";

/** Small preview of the loudest participant who has camera or screen share (minimized call / thread). */
export function MinimizedCallVideoThumb({
  className,
}: {
  className?: string;
}) {
  const trackRef = useLoudestVideoTrackRef();

  if (!trackRef) return null;

  const isShare = trackRef.source === Track.Source.ScreenShare;

  return (
    <div
      className={cn(
        "relative h-11 w-[4.75rem] shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-white/15",
        className,
      )}
    >
      <TrackRefContextIfNeeded trackRef={trackRef}>
        <ParticipantContextIfNeeded participant={trackRef.participant}>
          <VideoTrack
            trackRef={trackRef}
            manageSubscription={false}
            className={cn(
              "h-full w-full",
              isShare ? "object-contain" : "object-cover",
            )}
          />
        </ParticipantContextIfNeeded>
      </TrackRefContextIfNeeded>
    </div>
  );
}
