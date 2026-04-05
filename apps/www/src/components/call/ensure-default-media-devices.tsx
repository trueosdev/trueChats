"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useRef } from "react";

/**
 * Re-applies system default mic, speaker, and (when requested) camera at the
 * start of each room session. LiveKit can otherwise keep concrete deviceIds
 * across reconnects or prior UI selections.
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
    const apply = () => {
      if (appliedThisSessionRef.current) return;
      appliedThisSessionRef.current = true;

      const tasks: Array<Promise<boolean | void>> = [
        room.switchActiveDevice("audioinput", "default", false),
        room.switchActiveDevice("audiooutput", "default", false),
      ];
      if (video) {
        tasks.push(room.switchActiveDevice("videoinput", "default", false));
      }
      void Promise.allSettled(tasks);
    };

    room.on(RoomEvent.SignalConnected, apply);
    room.on(RoomEvent.Connected, apply);
    return () => {
      room.off(RoomEvent.SignalConnected, apply);
      room.off(RoomEvent.Connected, apply);
    };
  }, [room, video]);

  return null;
}
