"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useRef } from "react";
import { getAudioSettingsSnapshot } from "@/hooks/useAudioSettings";

/**
 * Pins the user's selected mic, speaker, and (when applicable) camera at the
 * start of each room session, and keeps them in sync with live edits in the
 * Audio/Video Settings dialog. `switchActiveDevice` is non-disruptive, so
 * changing devices mid-call works without reconnecting.
 */
export function EnsureDefaultMediaDevices({ video }: { video: boolean }) {
  const room = useRoomContext();
  const appliedThisSessionRef = useRef(false);

  useEffect(() => {
    const onDisconnected = () => {
      appliedThisSessionRef.current = false;
    };
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room]);

  useEffect(() => {
    const applyDevices = () => {
      const { micDeviceId, speakerDeviceId, cameraDeviceId } =
        getAudioSettingsSnapshot();

      const tasks: Array<Promise<boolean | void>> = [
        room.switchActiveDevice("audioinput", micDeviceId || "default", false),
        room.switchActiveDevice("audiooutput", speakerDeviceId || "default", false),
      ];
      if (video) {
        tasks.push(
          room.switchActiveDevice("videoinput", cameraDeviceId || "default", false),
        );
      }
      void Promise.allSettled(tasks);
    };

    const applyInitial = () => {
      if (appliedThisSessionRef.current) return;
      appliedThisSessionRef.current = true;
      applyDevices();
    };

    room.on(RoomEvent.SignalConnected, applyInitial);
    room.on(RoomEvent.Connected, applyInitial);

    // Keep devices in sync with live settings edits while a call is active.
    window.addEventListener("truechats:audio-settings-changed", applyDevices);
    window.addEventListener("storage", applyDevices);

    return () => {
      room.off(RoomEvent.SignalConnected, applyInitial);
      room.off(RoomEvent.Connected, applyInitial);
      window.removeEventListener("truechats:audio-settings-changed", applyDevices);
      window.removeEventListener("storage", applyDevices);
    };
  }, [room, video]);

  return null;
}
