"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AudioTrack,
  useEnsureTrackRef,
  useLocalParticipant,
  useTracks,
  type ParticipantTileProps,
} from "@livekit/components-react";
import { CallParticipantTile } from "@/components/call/call-participant-tile";
import { getTrackReferenceId } from "@livekit/components-core";
import { Track } from "livekit-client";
import { MonitorSpeaker, Volume2, VolumeX } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Unit separator so mix keys never collide with raw LiveKit identities. */
const MIX_KEY_SCREEN_AUDIO = "\u001fssa";

export type ParticipantAudioMixKind = "microphone" | "screen_share_audio";

/** Storage key for per-source volume (mic vs tab/system audio from screen share). */
export function participantAudioMixKey(
  identity: string,
  kind: ParticipantAudioMixKind,
): string {
  return kind === "screen_share_audio"
    ? `${identity}${MIX_KEY_SCREEN_AUDIO}`
    : identity;
}

type MixEntry = { volume: number; muted: boolean };

const defaultMix: MixEntry = { volume: 1, muted: false };

type CallAudioMixerContextValue = {
  getMix: (identity: string) => MixEntry;
  getEffectiveVolume: (identity: string) => number;
  setVolume: (identity: string, volume: number) => void;
  toggleMute: (identity: string) => void;
};

const CallAudioMixerContext = createContext<CallAudioMixerContextValue | null>(
  null,
);

export function CallAudioMixerProvider({ children }: { children: ReactNode }) {
  const [mix, setMix] = useState<Record<string, MixEntry>>({});

  const getMix = useCallback(
    (identity: string) => mix[identity] ?? defaultMix,
    [mix],
  );

  const getEffectiveVolume = useCallback(
    (identity: string) => {
      const m = getMix(identity);
      return m.muted ? 0 : m.volume;
    },
    [getMix],
  );

  const setVolume = useCallback((identity: string, volume: number) => {
    const v = Math.min(1, Math.max(0, volume));
    setMix((prev) => ({
      ...prev,
      [identity]: { volume: v, muted: false },
    }));
  }, []);

  const toggleMute = useCallback((identity: string) => {
    setMix((prev) => {
      const cur = prev[identity] ?? defaultMix;
      return {
        ...prev,
        [identity]: { ...cur, muted: !cur.muted },
      };
    });
  }, []);

  const value = useMemo(
    () => ({ getMix, getEffectiveVolume, setVolume, toggleMute }),
    [getMix, getEffectiveVolume, setVolume, toggleMute],
  );

  return (
    <CallAudioMixerContext.Provider value={value}>
      {children}
    </CallAudioMixerContext.Provider>
  );
}

function useCallAudioMixer() {
  const ctx = useContext(CallAudioMixerContext);
  if (!ctx) {
    throw new Error("useCallAudioMixer requires CallAudioMixerProvider");
  }
  return ctx;
}

/** Renders remote mic / screen-audio with per-participant volume from the mixer. */
export function PerParticipantRoomAudioRenderer() {
  const { getEffectiveVolume } = useCallAudioMixer();
  const tracks = useTracks(
    [
      Track.Source.Microphone,
      Track.Source.ScreenShareAudio,
      Track.Source.Unknown,
    ],
    { updateOnlyOn: [], onlySubscribed: true },
  ).filter(
    (ref) =>
      !ref.participant.isLocal && ref.publication.kind === Track.Kind.Audio,
  );

  return (
    <div className="hidden" aria-hidden>
      {tracks.map((trackRef) => {
        const mixKey = participantAudioMixKey(
          trackRef.participant.identity,
          trackRef.source === Track.Source.ScreenShareAudio
            ? "screen_share_audio"
            : "microphone",
        );
        return (
          <AudioTrack
            key={getTrackReferenceId(trackRef)}
            trackRef={trackRef}
            volume={getEffectiveVolume(mixKey)}
          />
        );
      })}
    </div>
  );
}

function ParticipantMixerMenuContent({
  mixKey,
  displayName,
  sourceLabel,
  audioMixKind,
  menuZClassName,
}: {
  mixKey: string;
  displayName: string;
  /** Shown above the name, e.g. "Microphone" vs "Screen share audio". */
  sourceLabel: string;
  audioMixKind: ParticipantAudioMixKind;
  menuZClassName?: string;
}) {
  const { getMix, setVolume, toggleMute } = useCallAudioMixer();
  const { volume, muted } = getMix(mixKey);
  const sliderPct = Math.round((muted ? 0 : volume) * 100);
  const isScreenShareAudio = audioMixKind === "screen_share_audio";

  return (
    <ContextMenuContent
      className={cn(
        "min-w-[15.5rem] max-w-[min(100vw-1.5rem,18rem)] gap-0 overflow-hidden border-border bg-background p-0 text-foreground",
        "rounded-md shadow-[0_4px_6px_-1px_rgb(0_0_0/0.08),0_2px_4px_-2px_rgb(0_0_0/0.06)]",
        "dark:shadow-[0_4px_6px_-1px_rgb(0_0_0/0.35),0_2px_4px_-2px_rgb(0_0_0/0.22)]",
        menuZClassName ?? "z-[500]",
      )}
      onCloseAutoFocus={(e) => e.preventDefault()}
    >
      <ContextMenuLabel className="border-b border-border px-3 pb-2.5 pt-3 font-normal">
        <span className="text-[11px] font-medium text-muted-foreground">
          {sourceLabel}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold leading-tight text-foreground">
          {displayName}
        </span>
      </ContextMenuLabel>
      <div
        className="flex items-center gap-3 px-3 py-3"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-11 w-11 shrink-0 rounded-full border border-border bg-background shadow-none",
            "text-foreground hover:bg-muted",
            muted &&
              "border-red-500/30 bg-red-500/15 text-red-700 hover:bg-red-500/20 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-500/25 dark:hover:text-red-300",
          )}
          aria-label={
            muted
              ? isScreenShareAudio
                ? "Unmute screen share audio"
                : "Unmute participant microphone"
              : isScreenShareAudio
                ? "Mute screen share audio"
                : "Mute participant microphone"
          }
          onClick={() => toggleMute(mixKey)}
        >
          {muted ? (
            <VolumeX className="h-[1.15rem] w-[1.15rem]" strokeWidth={2} />
          ) : isScreenShareAudio ? (
            <MonitorSpeaker className="h-[1.15rem] w-[1.15rem]" strokeWidth={2} />
          ) : (
            <Volume2 className="h-[1.15rem] w-[1.15rem]" strokeWidth={2} />
          )}
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Level
            </span>
            <span className="tabular-nums text-[11px] text-muted-foreground">
              {sliderPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderPct}
            aria-label={`${sourceLabel} volume for ${displayName}`}
            className={cn(
              "h-2 w-full min-w-0 cursor-pointer appearance-none rounded-full bg-transparent",
              "accent-primary",
              "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-black/20 dark:[&::-webkit-slider-runnable-track]:bg-white/25",
              "[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm",
              "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0 [&::-moz-range-track]:bg-black/20 dark:[&::-moz-range-track]:bg-white/25",
              "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow-sm",
            )}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setVolume(mixKey, v);
            }}
          />
        </div>
      </div>
    </ContextMenuContent>
  );
}

export type MixerParticipantTileProps = ParticipantTileProps & {
  /** Use on full-screen call UI so the menu stacks above high z-index overlays. */
  mixerMenuContentClassName?: string;
};

/**
 * Same as LiveKit `ParticipantTile`, but remote participants get a right-click menu
 * with mute and volume (local tile unchanged).
 */
export const MixerParticipantTile = forwardRef<
  HTMLDivElement,
  MixerParticipantTileProps
>(function MixerParticipantTile(props, ref) {
  const { mixerMenuContentClassName, ...tileProps } = props;
  const trackReference = useEnsureTrackRef(tileProps.trackRef);
  const { localParticipant } = useLocalParticipant();

  const isLocal =
    trackReference.participant.identity === localParticipant.identity;

  if (isLocal) {
    return <CallParticipantTile ref={ref} {...tileProps} />;
  }

  const displayName =
    trackReference.participant.name ||
    trackReference.participant.identity ||
    "Participant";

  const audioMixKind: ParticipantAudioMixKind =
    trackReference.source === Track.Source.ScreenShare
      ? "screen_share_audio"
      : "microphone";
  const mixKey = participantAudioMixKey(
    trackReference.participant.identity,
    audioMixKind,
  );
  const sourceLabel =
    audioMixKind === "screen_share_audio"
      ? "Screen share audio"
      : "Microphone";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={ref}
          className="relative h-full min-h-0 w-full min-w-0"
        >
          <CallParticipantTile
            {...tileProps}
            className={cn("h-full w-full", tileProps.className)}
          />
        </div>
      </ContextMenuTrigger>
      <ParticipantMixerMenuContent
        mixKey={mixKey}
        displayName={displayName}
        sourceLabel={sourceLabel}
        audioMixKind={audioMixKind}
        menuZClassName={mixerMenuContentClassName}
      />
    </ContextMenu>
  );
});

export function RemoteParticipantMixerBubble({
  identity,
  displayName,
  menuZClassName,
  children,
}: {
  identity: string;
  displayName: string;
  menuZClassName?: string;
  children: ReactNode;
}) {
  const mixKey = participantAudioMixKey(identity, "microphone");
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="inline-flex cursor-context-menu">{children}</div>
      </ContextMenuTrigger>
      <ParticipantMixerMenuContent
        mixKey={mixKey}
        displayName={displayName}
        sourceLabel="Microphone"
        audioMixKind="microphone"
        menuZClassName={menuZClassName}
      />
    </ContextMenu>
  );
}
