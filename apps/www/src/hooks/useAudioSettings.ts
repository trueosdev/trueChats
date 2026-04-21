"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type AudioQuality = "normal" | "high";

export interface AudioSettings {
  /** Bitrate/preset tier used for outgoing audio. */
  quality: AudioQuality;
  /** `deviceId` for the preferred microphone, or `"default"` to follow the OS. */
  micDeviceId: string;
  /** `deviceId` for the preferred speaker, or `"default"` to follow the OS. */
  speakerDeviceId: string;
  /** `deviceId` for the preferred camera, or `"default"` to follow the OS. */
  cameraDeviceId: string;
  /** Browser AEC. High-quality mode disables this; required with speakers to prevent feedback. */
  echoCancellation: boolean;
  /** Browser noise suppression. */
  noiseSuppression: boolean;
  /** Browser auto-gain control. */
  autoGainControl: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  quality: "normal",
  micDeviceId: "default",
  speakerDeviceId: "default",
  cameraDeviceId: "default",
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const STORAGE_KEY = "truechats:audio-settings:v1";
const EVENT_NAME = "truechats:audio-settings-changed";

function readFromStorage(): AudioSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return { ...DEFAULT_AUDIO_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

function writeToStorage(next: AudioSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // swallow quota/serialization errors; settings are best-effort
  }
}

/**
 * React hook backing the Audio/Video settings dialog. Settings live in
 * `localStorage` and a window event keeps every subscriber (dialog, call
 * providers, device pinner) in sync without prop drilling through the tree.
 */
export function useAudioSettings() {
  const [settings, setSettingsState] = useState<AudioSettings>(
    DEFAULT_AUDIO_SETTINGS,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettingsState(readFromStorage());
    setMounted(true);

    const syncFromStorage = () => setSettingsState(readFromStorage());
    window.addEventListener(EVENT_NAME, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<AudioSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...patch };
        writeToStorage(next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    writeToStorage(DEFAULT_AUDIO_SETTINGS);
    setSettingsState(DEFAULT_AUDIO_SETTINGS);
  }, []);

  return useMemo(
    () => ({ settings, updateSettings, resetSettings, mounted }),
    [settings, updateSettings, resetSettings, mounted],
  );
}

/** Read the current settings synchronously, e.g. when building LiveKit options. */
export function getAudioSettingsSnapshot(): AudioSettings {
  return readFromStorage();
}
