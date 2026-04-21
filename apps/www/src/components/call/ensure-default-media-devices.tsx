"use client";

import { useRoomContext } from "@livekit/components-react";
import {
  RoomEvent,
  Track,
  type AudioCaptureOptions,
  type TrackPublishDefaults,
} from "livekit-client";
import { useEffect, useRef } from "react";
import {
  getAudioSettingsSnapshot,
  type AudioSettings,
} from "@/hooks/useAudioSettings";
import { buildRoomMediaDefaults } from "./livekit-room-media-defaults";

/**
 * Pins the user's selected mic, speaker, and (when applicable) camera at the
 * start of each room session, and keeps them in sync with live edits in the
 * Audio/Video Settings dialog.
 *
 * Two levels of sync depending on what changed:
 *   - Device-only edits (a different mic, speaker, or camera) → cheap
 *     `switchActiveDevice`; no reconnect, no audio dropout.
 *   - Capture (EC / NS / AGC) or publish (quality preset, DTX, stereo)
 *     edits → republish the local mic track with new `AudioCaptureOptions`
 *     + `TrackPublishDefaults` via `setMicrophoneEnabled(true, …)`.
 *     A ~200 ms audio blip happens here; that's the cost of getUserMedia
 *     re-acquisition. We also mutate `room.options` so anything the user
 *     publishes later (e.g. unmuting) picks up the new defaults too.
 */
export function EnsureDefaultMediaDevices({ video }: { video: boolean }) {
  const room = useRoomContext();
  const appliedThisSessionRef = useRef(false);
  const lastAppliedSettingsRef = useRef<AudioSettings | null>(null);
  const republishInFlightRef = useRef(false);

  useEffect(() => {
    const onDisconnected = () => {
      appliedThisSessionRef.current = false;
      lastAppliedSettingsRef.current = null;
    };
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room]);

  useEffect(() => {
    const applyDeviceIds = (settings: AudioSettings) => {
      const tasks: Array<Promise<boolean | void>> = [
        room.switchActiveDevice("audioinput", settings.micDeviceId || "default", false),
        room.switchActiveDevice("audiooutput", settings.speakerDeviceId || "default", false),
      ];
      if (video) {
        tasks.push(
          room.switchActiveDevice("videoinput", settings.cameraDeviceId || "default", false),
        );
      }
      void Promise.allSettled(tasks);
    };

    const republishMicrophone = async (settings: AudioSettings) => {
      if (republishInFlightRef.current) return;
      republishInFlightRef.current = true;
      try {
        const lp = room.localParticipant;

        // Keep the saved options on the Room object in sync so any future
        // publish (e.g. the user un-mutes after we updated settings) uses the
        // new capture + publish defaults rather than the stale ones captured
        // at `new Room(options)` time.
        const fresh = buildRoomMediaDefaults(settings);
        const mutableOptions = room.options as {
          audioCaptureDefaults?: AudioCaptureOptions;
          publishDefaults?: TrackPublishDefaults;
        };
        mutableOptions.audioCaptureDefaults = fresh.audioCaptureDefaults;
        mutableOptions.publishDefaults = {
          ...mutableOptions.publishDefaults,
          ...fresh.publishDefaults,
        };

        // Only republish if the mic is currently published. If the user has
        // the mic off, the settings will apply the next time they turn it on
        // via the control bar because we just mutated the defaults above.
        if (!lp.isMicrophoneEnabled) return;

        const pub = lp.getTrackPublication(Track.Source.Microphone);
        const wasMuted = pub?.isMuted ?? false;

        await lp.setMicrophoneEnabled(
          true,
          fresh.audioCaptureDefaults,
          fresh.publishDefaults,
        );

        if (wasMuted) {
          const newPub = lp.getTrackPublication(Track.Source.Microphone);
          await newPub?.mute();
        }
      } catch (err) {
        console.warn("[ensure-default-media-devices] republish mic failed:", err);
      } finally {
        republishInFlightRef.current = false;
      }
    };

    const onSettingsChanged = () => {
      const next = getAudioSettingsSnapshot();
      const prev = lastAppliedSettingsRef.current;
      lastAppliedSettingsRef.current = next;

      if (!prev) {
        // First settings read after (re)connect — already applied via `applyInitial`.
        return;
      }

      const captureOrPublishChanged =
        prev.echoCancellation !== next.echoCancellation ||
        prev.noiseSuppression !== next.noiseSuppression ||
        prev.autoGainControl !== next.autoGainControl ||
        prev.quality !== next.quality;

      const speakerChanged = prev.speakerDeviceId !== next.speakerDeviceId;
      const cameraChanged = video && prev.cameraDeviceId !== next.cameraDeviceId;
      const micDeviceChanged = prev.micDeviceId !== next.micDeviceId;

      // Speaker and camera are pure device swaps regardless of other changes.
      if (speakerChanged) {
        void room.switchActiveDevice(
          "audiooutput",
          next.speakerDeviceId || "default",
          false,
        );
      }
      if (cameraChanged) {
        void room.switchActiveDevice(
          "videoinput",
          next.cameraDeviceId || "default",
          false,
        );
      }

      if (captureOrPublishChanged) {
        // Full track swap picks up the new deviceId for mic as well, so no
        // separate `switchActiveDevice("audioinput")` call is needed here.
        void republishMicrophone(next);
      } else if (micDeviceChanged) {
        void room.switchActiveDevice(
          "audioinput",
          next.micDeviceId || "default",
          false,
        );
      }
    };

    const applyInitial = () => {
      if (appliedThisSessionRef.current) return;
      appliedThisSessionRef.current = true;
      const snapshot = getAudioSettingsSnapshot();
      lastAppliedSettingsRef.current = snapshot;
      applyDeviceIds(snapshot);
    };

    room.on(RoomEvent.SignalConnected, applyInitial);
    room.on(RoomEvent.Connected, applyInitial);

    window.addEventListener("truechats:audio-settings-changed", onSettingsChanged);
    window.addEventListener("storage", onSettingsChanged);

    return () => {
      room.off(RoomEvent.SignalConnected, applyInitial);
      room.off(RoomEvent.Connected, applyInitial);
      window.removeEventListener("truechats:audio-settings-changed", onSettingsChanged);
      window.removeEventListener("storage", onSettingsChanged);
    };
  }, [room, video]);

  return null;
}
