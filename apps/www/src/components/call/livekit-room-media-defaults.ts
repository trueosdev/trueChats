import type { RoomOptions } from "livekit-client";

/**
 * Pin input/output to the browser/OS "default" device so each session follows
 * system defaults instead of a previously selected hardware id.
 */
export const LIVEKIT_ROOM_MEDIA_DEFAULTS: Pick<
  RoomOptions,
  "audioCaptureDefaults" | "videoCaptureDefaults" | "audioOutput"
> = {
  audioCaptureDefaults: { deviceId: "default" },
  videoCaptureDefaults: { deviceId: "default" },
  audioOutput: { deviceId: "default" },
};
