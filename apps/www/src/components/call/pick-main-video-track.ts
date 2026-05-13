import { isTrackReference } from "@livekit/components-core";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { Track } from "livekit-client";

/**
 * Spotlight track for thread / DM video.
 *
 * Any live screen share wins over camera tracks so the presenter (local or
 * remote) sees the shared content as the main stage, not someone else's camera.
 * Among cameras, prefer remote before local so the solo preview is not stuck
 * on self when others are on video.
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
    liveScreen(true) ??
    liveCam(false) ??
    liveCam(true) ??
    null
  );
}
