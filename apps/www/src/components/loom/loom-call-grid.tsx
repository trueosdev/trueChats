"use client";

import { useEffect, useMemo, useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { useTracks } from "@livekit/components-react";
import {
  getTrackReferenceId,
  isTrackReference,
  type TrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-core";
import { pickMainVideoTrackPreferRemote } from "@/components/call/pick-main-video-track";
import { MixerParticipantTile } from "@/components/call/call-audio-mixer";
import { ConferenceParticipantStrip } from "@/components/call/conference-participant-strip";
import { LocalCameraScreenSharePip } from "@/components/call/local-camera-screen-share-pip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Track } from "livekit-client";

function useWidescreenShareFilmstrip(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 960px) and (min-aspect-ratio: 4/3)",
    );
    const go = () => setWide(mq.matches);
    go();
    mq.addEventListener("change", go);
    return () => mq.removeEventListener("change", go);
  }, []);
  return wide;
}

function sortCameraTracksForGallery(
  tracks: TrackReferenceOrPlaceholder[],
): TrackReferenceOrPlaceholder[] {
  const cams = tracks.filter(
    (t) => isTrackReference(t) && t.source === Track.Source.Camera,
  );
  const remotes = cams
    .filter((t) => !t.participant.isLocal)
    .sort((a, b) =>
      a.participant.identity.localeCompare(b.participant.identity),
    );
  const locals = cams.filter((t) => t.participant.isLocal);
  return [...remotes, ...locals];
}

function byIdentity(a: TrackReference, b: TrackReference) {
  return a.participant.identity.localeCompare(b.participant.identity);
}

function buildGalleryLayout(
  tracks: TrackReferenceOrPlaceholder[],
  pinnedIdentity: string | null,
):
  | { mode: "flat"; tiles: TrackReferenceOrPlaceholder[] }
  | { mode: "speaker"; featured: TrackReference; rest: TrackReference[] } {
  const ordered = sortCameraTracksForGallery(tracks).filter(isTrackReference);
  const n = ordered.length;

  if (n <= 2) {
    return { mode: "flat", tiles: sortCameraTracksForGallery(tracks) };
  }

  let featured: TrackReference | undefined;
  let rest: TrackReference[];

  if (pinnedIdentity) {
    const p = ordered.find((x) => x.participant.identity === pinnedIdentity);
    if (p) {
      featured = p;
      rest = ordered.filter((x) => x.participant.identity !== pinnedIdentity);
      rest.sort(byIdentity);
      return { mode: "speaker", featured, rest };
    }
  }

  const byAudio = [...ordered].sort((a, b) => {
    const d =
      (b.participant.audioLevel ?? 0) - (a.participant.audioLevel ?? 0);
    if (Math.abs(d) > 0.005) return d;
    return byIdentity(a, b);
  });
  featured = byAudio[0]!;
  rest = ordered.filter(
    (x) => x.participant.identity !== featured!.participant.identity,
  );
  rest.sort(byIdentity);
  return { mode: "speaker", featured, rest };
}

function PinToggle({
  identity,
  pinnedIdentity,
  onToggle,
  label,
}: {
  identity: string;
  pinnedIdentity: string | null;
  onToggle: (identity: string) => void;
  label: string;
}) {
  const pinned = pinnedIdentity === identity;
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={cn(
        "h-8 w-8 rounded-md border border-white/20 bg-background/90 text-foreground shadow-md backdrop-blur-sm",
        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
        "hover:bg-background",
        pinned && "opacity-100 ring-2 ring-primary/70",
      )}
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${label}` : `Pin ${label} as spotlight`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle(identity);
      }}
    >
      {pinned ? (
        <PinOff className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <Pin className="h-3.5 w-3.5" strokeWidth={2} />
      )}
    </Button>
  );
}

function PinnedVideoShell({
  trackRef,
  pinnedIdentity,
  onTogglePin,
  featured,
  className,
  mixerMenuContentClassName,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  pinnedIdentity: string | null;
  onTogglePin: (identity: string) => void;
  featured?: boolean;
  className?: string;
  mixerMenuContentClassName?: string;
}) {
  const identity = isTrackReference(trackRef)
    ? trackRef.participant.identity
    : "";
  const displayName = isTrackReference(trackRef)
    ? trackRef.participant.name || trackRef.participant.identity
    : "Participant";
  const pinned = pinnedIdentity === identity;

  return (
    <div
      className={cn(
        "group thread-call-gallery-tile relative min-h-0 overflow-hidden rounded-lg bg-muted/15",
        featured && "thread-call-gallery-featured",
        pinned && "ring-2 ring-primary/75 ring-offset-2 ring-offset-background",
        className,
      )}
    >
      {identity ? (
        <div className="absolute right-1.5 top-1.5 z-30">
          <PinToggle
            identity={identity}
            pinnedIdentity={pinnedIdentity}
            onToggle={onTogglePin}
            label={displayName}
          />
        </div>
      ) : null}
      <MixerParticipantTile
        trackRef={trackRef}
        className="!h-full !min-h-0 !w-full !min-w-0"
        mixerMenuContentClassName={mixerMenuContentClassName}
      />
    </div>
  );
}

export function LoomCallGrid() {
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const wideShareFilmstrip = useWidescreenShareFilmstrip();

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const hasLiveScreenShare = useMemo(
    () =>
      tracks.some(
        (t) =>
          isTrackReference(t) &&
          t.source === Track.Source.ScreenShare &&
          !t.publication.isMuted,
      ),
    [tracks],
  );

  const spotlightTrack = useMemo(
    () =>
      hasLiveScreenShare ? pickMainVideoTrackPreferRemote(tracks) : null,
    [tracks, hasLiveScreenShare],
  );

  const galleryCameraTracks = useMemo(
    () => sortCameraTracksForGallery(tracks),
    [tracks],
  );

  const remoteCameraTracks = useMemo(
    () =>
      galleryCameraTracks.filter(
        (t) => isTrackReference(t) && !t.participant.isLocal,
      ),
    [galleryCameraTracks],
  );

  const participantIdentities = useMemo(() => {
    const s = new Set<string>();
    for (const t of galleryCameraTracks) {
      if (isTrackReference(t)) s.add(t.participant.identity);
    }
    return s;
  }, [galleryCameraTracks]);

  useEffect(() => {
    if (pinnedIdentity && !participantIdentities.has(pinnedIdentity)) {
      setPinnedIdentity(null);
    }
  }, [pinnedIdentity, participantIdentities]);

  const galleryLayout = useMemo(
    () => buildGalleryLayout(tracks, pinnedIdentity),
    [tracks, pinnedIdentity],
  );

  const showShareFilmstrip =
    hasLiveScreenShare &&
    spotlightTrack != null &&
    remoteCameraTracks.length > 0;

  const showAvatarStrip =
    (!hasLiveScreenShare && galleryCameraTracks.length === 0) ||
    (hasLiveScreenShare &&
      spotlightTrack != null &&
      remoteCameraTracks.length === 0);

  const onTogglePin = (identity: string) => {
    setPinnedIdentity((cur) => (cur === identity ? null : identity));
  };

  const filmstripTiles = (
    <div
      className={cn(
        "thread-call-share-filmstrip flex gap-2 bg-background/90 px-2 py-2 backdrop-blur-sm",
        wideShareFilmstrip
          ? "max-h-none w-[7.25rem] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-l border-white/10 sm:w-[10rem]"
          : "max-h-[28%] shrink-0 flex-row overflow-x-auto overflow-y-hidden border-t border-white/10",
      )}
      role="region"
      aria-label="Other participants"
    >
      {remoteCameraTracks.map((trackRef) => (
        <PinnedVideoShell
          key={getTrackReferenceId(trackRef)}
          trackRef={trackRef}
          pinnedIdentity={pinnedIdentity}
          onTogglePin={onTogglePin}
          className={cn(
            wideShareFilmstrip
              ? "thread-call-share-filmstrip-tile h-[4.5rem] w-full shrink-0 sm:h-[5.25rem]"
              : "thread-call-share-filmstrip-tile h-[4.5rem] w-[7.5rem] shrink-0 sm:h-[5.25rem] sm:w-[9.25rem]",
          )}
          mixerMenuContentClassName="z-[600]"
        />
      ))}
    </div>
  );

  const shareStage = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex min-h-0 overflow-hidden",
          showShareFilmstrip && wideShareFilmstrip
            ? "flex-1 flex-row"
            : "flex-1 flex-col",
        )}
      >
        <div
          className={cn(
            "thread-call-main-stage relative min-h-0 overflow-hidden bg-background",
            showShareFilmstrip && wideShareFilmstrip
              ? "min-w-0 flex-1"
              : "flex-1",
          )}
        >
          {spotlightTrack ? (
            <>
              <MixerParticipantTile
                trackRef={spotlightTrack}
                className="!h-full !min-h-0 !w-full !min-w-0"
                mixerMenuContentClassName="z-[600]"
              />
              <LocalCameraScreenSharePip
                mainTrack={spotlightTrack}
                mixerMenuContentClassName="z-[600]"
              />
            </>
          ) : null}
        </div>
        {showShareFilmstrip ? filmstripTiles : null}
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {hasLiveScreenShare && spotlightTrack ? (
        shareStage
      ) : (
        <div className="relative min-h-0 flex-1 overflow-auto bg-background">
          {galleryLayout.mode === "flat" ? (
            <div className="grid h-full min-h-0 gap-2 p-2 [grid-auto-rows:minmax(9rem,1fr)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
              {galleryLayout.tiles.map((trackRef) => (
                <PinnedVideoShell
                  key={getTrackReferenceId(trackRef)}
                  trackRef={trackRef}
                  pinnedIdentity={pinnedIdentity}
                  onTogglePin={onTogglePin}
                  mixerMenuContentClassName="z-[600]"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-2 p-2">
              <PinnedVideoShell
                trackRef={galleryLayout.featured}
                pinnedIdentity={pinnedIdentity}
                onTogglePin={onTogglePin}
                featured
                className="min-h-[min(42vh,14rem)] shrink-0 sm:min-h-[min(38vh,16rem)]"
                mixerMenuContentClassName="z-[600]"
              />
              <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 [grid-auto-rows:minmax(8rem,1fr)] sm:grid-cols-3">
                {galleryLayout.rest.map((trackRef) => (
                  <PinnedVideoShell
                    key={getTrackReferenceId(trackRef)}
                    trackRef={trackRef}
                    pinnedIdentity={pinnedIdentity}
                    onTogglePin={onTogglePin}
                    mixerMenuContentClassName="z-[600]"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {showAvatarStrip ? (
        <ConferenceParticipantStrip
          centered={
            !hasLiveScreenShare && galleryCameraTracks.length === 0
          }
          mixerMenuContentClassName="z-[600]"
          className={
            hasLiveScreenShare ? "border-white/15 bg-background/70" : undefined
          }
        />
      ) : null}
    </div>
  );
}
