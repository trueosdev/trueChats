import { isTrackReference } from "@livekit/components-core";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { Track } from "livekit-client";

/**
 * Spotlight track for thread / DM video: prefer remote screen and camera so the
 * main stage is not stuck on the local preview when others are publishing.
 */
export function pickMainVideoTrackPreferRemote(
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
  return (
    liveScreen(false) ??
    liveCam(false) ??
    liveScreen(true) ??
    liveCam(true) ??
    null
  );
}
