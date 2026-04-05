"use client";

import type { Participant } from "livekit-client";
import { useIsSpeaking } from "@livekit/components-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import { cn } from "@/lib/utils";

const sizePresets = {
  /** DM audio-only row */
  compact: {
    wrap: "h-28 w-28",
    avatar: "h-[4.5rem] w-[4.5rem]",
    ring: "h-[4.9rem] w-[4.9rem]",
  },
  /** Video tile when camera is off */
  comfortable: {
    wrap: "h-[min(42vw,10.5rem)] w-[min(42vw,10.5rem)] min-h-[7.5rem] min-w-[7.5rem] max-h-[11rem] max-w-[11rem]",
    avatar: "h-[72%] w-[72%] max-h-36 max-w-36",
    ring: "h-[78%] w-[78%] max-h-[9.85rem] max-w-[9.85rem]",
  },
} as const;

export type CallSpeakingAvatarSize = keyof typeof sizePresets;

export function CallSpeakingAvatar({
  participant,
  avatarUrl,
  alt,
  size = "comfortable",
  showName,
  nameClassName,
}: {
  participant: Participant;
  avatarUrl: string | null;
  alt: string;
  size?: CallSpeakingAvatarSize;
  /** Optional label under the avatar (e.g. audio-only layout) */
  showName?: string;
  nameClassName?: string;
}) {
  const isSpeaking = useIsSpeaking(participant);
  const preset = sizePresets[size];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          preset.wrap,
        )}
      >
        {isSpeaking ? (
          <>
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <span
                className={cn(
                  "block rounded-full border-2 border-emerald-400/80 shadow-[0_0_16px_rgba(52,211,153,0.4)] animate-speak-ring-expand",
                  preset.ring,
                )}
              />
            </span>
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <span
                className={cn(
                  "block rounded-full border border-emerald-400/50 animate-speak-ring-expand [animation-delay:550ms]",
                  preset.ring,
                )}
              />
            </span>
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <span
                className={cn(
                  "block rounded-full border border-emerald-300/35 animate-speak-ring-expand [animation-delay:1s]",
                  preset.ring,
                )}
              />
            </span>
          </>
        ) : null}

        <Avatar
          className={cn(
            "relative z-10 shrink-0 border-2 transition-[box-shadow,border-color] duration-300",
            preset.avatar,
            isSpeaking
              ? "border-emerald-400/95 shadow-[0_0_22px_rgba(52,211,153,0.32)]"
              : "border-white/20 shadow-none",
          )}
        >
          <ThemeAvatarImage avatarUrl={avatarUrl} alt={alt} />
        </Avatar>
      </div>
      {showName ? (
        <p
          className={cn(
            "max-w-[12rem] truncate text-center text-sm font-medium text-white/80",
            nameClassName,
          )}
        >
          {showName}
        </p>
      ) : null}
    </div>
  );
}
