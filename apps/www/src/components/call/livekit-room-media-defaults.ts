import { AudioPresets, type RoomOptions } from "livekit-client";
import type { AudioSettings } from "@/hooks/useAudioSettings";
import { DEFAULT_AUDIO_SETTINGS } from "@/hooks/useAudioSettings";

/** Keep remote video subscribed; avoid intersection-based unsubscribe quirks in custom layouts. */
export const LIVEKIT_UI_FEATURE_FLAGS = { autoSubscription: false as const };

/**
 * Translate the user's saved audio settings into LiveKit `RoomOptions`.
 *
 * `audioCaptureDefaults` controls `getUserMedia` constraints (device + browser
 * DSP toggles); `publishDefaults` controls the Opus encoder on the way out.
 * High-quality mode swaps the default speech preset for a stereo music-grade
 * preset, enables forceStereo, and turns off browser DSP that thins music.
 */
export function buildRoomMediaDefaults(
  settings: AudioSettings,
): Pick<
  RoomOptions,
  "audioCaptureDefaults" | "videoCaptureDefaults" | "audioOutput" | "publishDefaults"
> {
  const isHigh = settings.quality === "high";

  return {
    audioCaptureDefaults: {
      deviceId: settings.micDeviceId || "default",
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
      channelCount: isHigh ? 2 : 1,
      sampleRate: 48000,
      sampleSize: 16,
    },
    videoCaptureDefaults: {
      deviceId: settings.cameraDeviceId || "default",
    },
    audioOutput: {
      deviceId: settings.speakerDeviceId || "default",
    },
    publishDefaults: {
      audioPreset: isHigh
        ? AudioPresets.musicHighQualityStereo
        : AudioPresets.speech,
      // Opus RED adds forward error correction cheaply; worth it in both modes.
      red: true,
      // DTX drops packets during silence — fine for speech, bad for music.
      dtx: !isHigh,
      forceStereo: isHigh,
    },
  };
}

/**
 * Default options used when no user override is available (e.g. SSR, or the
 * first render before `useAudioSettings` has read `localStorage`).
 */
export const LIVEKIT_ROOM_MEDIA_DEFAULTS = buildRoomMediaDefaults(
  DEFAULT_AUDIO_SETTINGS,
);
