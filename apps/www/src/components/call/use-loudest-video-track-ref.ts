"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoomContext, useTracks } from "@livekit/components-react";
import { isTrackReference, type TrackReference } from "@livekit/components-core";
import { RoomEvent, Track } from "livekit-client";

/**
 * Subscribed camera or screen-share track for the participant with the highest
 * current audio level (LiveKit active speaker levels). Used for minimized-call PiP.
 */
export function useLoudestVideoTrackRef(): TrackReference | null {
  const room = useRoomContext();
  const [speakersEpoch, setSpeakersEpoch] = useState(0);

  useEffect(() => {
    const onSpeakers = () => setSpeakersEpoch((n) => n + 1);
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    };
  }, [room]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  return useMemo(() => {
    const live: TrackReference[] = [];
    for (const t of tracks) {
      if (!isTrackReference(t)) continue;
      if (!t.publication?.track) continue;
      if (t.publication.kind !== Track.Kind.Video) continue;
      if (
        t.source !== Track.Source.Camera &&
        t.source !== Track.Source.ScreenShare
      ) {
        continue;
      }
      live.push(t);
    }
    if (live.length === 0) return null;

    const rankSource = (s: Track.Source) =>
      s === Track.Source.ScreenShare ? 2 : s === Track.Source.Camera ? 1 : 0;

    const sorted = [...live].sort((a, b) => {
      const levelDiff =
        (b.participant.audioLevel ?? 0) - (a.participant.audioLevel ?? 0);
      if (Math.abs(levelDiff) > 0.001) return levelDiff;
      const srcDiff = rankSource(b.source) - rankSource(a.source);
      if (srcDiff !== 0) return srcDiff;
      return a.participant.identity.localeCompare(b.participant.identity);
    });

    return sorted[0] ?? null;
  }, [tracks, speakersEpoch]);
}
