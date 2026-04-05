"use client";

import * as React from "react";
import { Track } from "livekit-client";
import type { ParticipantClickEvent, TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { isTrackReference, isTrackReferencePinned } from "@livekit/components-core";
import {
  AudioTrack,
  ConnectionQualityIndicator,
  FocusToggle,
  LockLockedIcon,
  ParticipantContextIfNeeded,
  ParticipantName,
  ScreenShareIcon,
  TrackMutedIndicator,
  TrackRefContextIfNeeded,
  VideoTrack,
  useEnsureTrackRef,
  useFeatureContext,
  useIsEncrypted,
  useMaybeLayoutContext,
  useParticipantTile,
} from "@livekit/components-react";
import { useAuth } from "@/hooks/useAuth";
import { CallSpeakingAvatar } from "@/components/call/call-speaking-avatar";

function avatarUrlFromParticipantMetadata(metadata: string | undefined): string | null {
  if (!metadata?.trim()) return null;
  try {
    const parsed = JSON.parse(metadata) as { avatarUrl?: unknown };
    if (typeof parsed.avatarUrl === "string" && parsed.avatarUrl.trim() !== "") {
      return parsed.avatarUrl.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export interface CallParticipantTileProps extends React.HTMLAttributes<HTMLDivElement> {
  trackRef?: TrackReferenceOrPlaceholder;
  disableSpeakingIndicator?: boolean;
  onParticipantClick?: (event: ParticipantClickEvent) => void;
}

/**
 * LiveKit {@link ParticipantTile} with a profile avatar when camera video is muted
 * (same visibility rules as the default placeholder).
 */
export const CallParticipantTile = React.forwardRef<HTMLDivElement, CallParticipantTileProps>(
  function CallParticipantTile(
    {
      trackRef,
      children,
      onParticipantClick,
      disableSpeakingIndicator,
      ...htmlProps
    }: CallParticipantTileProps,
    ref,
  ) {
    const { user } = useAuth();
    const trackReference = useEnsureTrackRef(trackRef);

    const { elementProps } = useParticipantTile<HTMLDivElement>({
      htmlProps,
      disableSpeakingIndicator,
      onParticipantClick,
      trackRef: trackReference,
    });
    const isEncrypted = useIsEncrypted(trackReference.participant);
    const layoutContext = useMaybeLayoutContext();
    const autoManageSubscription = useFeatureContext()?.autoSubscription;

    const avatarFromMeta = avatarUrlFromParticipantMetadata(trackReference.participant.metadata);
    const localAvatar =
      typeof user?.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;
    const avatarUrl =
      avatarFromMeta ?? (trackReference.participant.isLocal ? localAvatar : null);

    const displayName =
      trackReference.participant.name ||
      trackReference.participant.identity ||
      "Participant";

    const handleSubscribe = React.useCallback(
      (subscribed: boolean) => {
        if (
          trackReference.source &&
          !subscribed &&
          layoutContext &&
          layoutContext.pin.dispatch &&
          isTrackReferencePinned(trackReference, layoutContext.pin.state)
        ) {
          layoutContext.pin.dispatch({ msg: "clear_pin" });
        }
      },
      [trackReference, layoutContext],
    );

    return (
      <div ref={ref} style={{ position: "relative" }} {...elementProps}>
        <TrackRefContextIfNeeded trackRef={trackReference}>
          <ParticipantContextIfNeeded participant={trackReference.participant}>
            {children ?? (
              <>
                {isTrackReference(trackReference) &&
                (trackReference.publication?.kind === "video" ||
                  trackReference.source === Track.Source.Camera ||
                  trackReference.source === Track.Source.ScreenShare) ? (
                  <VideoTrack
                    trackRef={trackReference}
                    onSubscriptionStatusChanged={handleSubscribe}
                    manageSubscription={autoManageSubscription}
                  />
                ) : (
                  isTrackReference(trackReference) && (
                    <AudioTrack
                      trackRef={trackReference}
                      onSubscriptionStatusChanged={handleSubscribe}
                    />
                  )
                )}
                <div className="lk-participant-placeholder !bg-black/40">
                  <CallSpeakingAvatar
                    participant={trackReference.participant}
                    avatarUrl={avatarUrl}
                    alt={displayName}
                    size="comfortable"
                  />
                </div>
                <div className="lk-participant-metadata">
                  <div className="lk-participant-metadata-item">
                    {trackReference.source === Track.Source.Camera ? (
                      <>
                        {isEncrypted && <LockLockedIcon style={{ marginRight: "0.25rem" }} />}
                        <TrackMutedIndicator
                          trackRef={{
                            participant: trackReference.participant,
                            source: Track.Source.Microphone,
                          }}
                          show={"muted"}
                        />
                        <ParticipantName />
                      </>
                    ) : (
                      <>
                        <ScreenShareIcon style={{ marginRight: "0.25rem" }} />
                        <ParticipantName>&apos;s screen</ParticipantName>
                      </>
                    )}
                  </div>
                  <ConnectionQualityIndicator className="lk-participant-metadata-item" />
                </div>
              </>
            )}
            <FocusToggle trackRef={trackReference} />
          </ParticipantContextIfNeeded>
        </TrackRefContextIfNeeded>
      </div>
    );
  },
);

CallParticipantTile.displayName = "CallParticipantTile";
