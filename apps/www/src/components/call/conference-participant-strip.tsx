"use client";

import { useMemo } from "react";
import type { Participant } from "livekit-client";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { useAuth } from "@/hooks/useAuth";
import { CallSpeakingAvatar } from "@/components/call/call-speaking-avatar";
import { RemoteParticipantMixerBubble } from "@/components/call/call-audio-mixer";
import { cn } from "@/lib/utils";

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

function participantDisplayName(p: Participant): string {
  return p.name || p.identity || "Participant";
}

function useOrderedCallParticipants(): Participant[] {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  return useMemo(
    () => [localParticipant, ...remotes],
    [localParticipant, remotes],
  );
}

/**
 * Horizontal row of speaking avatars (no video tiles). For use inside LiveKitRoom.
 * Use `centered` when there is no camera/screen share so avatars sit in the middle of the call area.
 */
export function ConferenceParticipantStrip({
  className,
  mixerMenuContentClassName,
  centered = false,
}: {
  className?: string;
  mixerMenuContentClassName?: string;
  /** Fills remaining height and centers the avatar row (audio-only / no main video). */
  centered?: boolean;
}) {
  const { user } = useAuth();
  const participants = useOrderedCallParticipants();
  const localAvatarFromProfile =
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  const cells = participants.map((p) => {
    const displayName = participantDisplayName(p);
    const avatarUrl = p.isLocal
      ? localAvatarFromProfile
      : avatarUrlFromParticipantMetadata(p.metadata);

    const avatar = (
      <CallSpeakingAvatar
        participant={p}
        avatarUrl={avatarUrl}
        alt={displayName}
        size="compact"
        showName={displayName}
            nameClassName="text-foreground/85"
      />
    );

    return (
      <div key={p.identity} className="flex flex-col items-center">
        {p.isLocal ? (
          avatar
        ) : (
          <RemoteParticipantMixerBubble
            identity={p.identity}
            displayName={displayName}
            menuZClassName={mixerMenuContentClassName}
          >
            {avatar}
          </RemoteParticipantMixerBubble>
        )}
      </div>
    );
  });

  return (
    <div
      className={cn(
        centered
          ? "flex min-h-0 flex-1 flex-col items-center justify-center bg-background px-4 py-8"
          : "flex shrink-0 flex-wrap items-end justify-center gap-6 border-t border-white/10 bg-background px-4 py-4",
        className,
      )}
    >
      {centered ? (
        <div className="flex flex-wrap items-center justify-center gap-6">
          {cells}
        </div>
      ) : (
        cells
      )}
    </div>
  );
}
