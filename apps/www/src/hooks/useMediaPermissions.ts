"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Normalized status used by the renderer. Maps roughly to macOS TCC states,
 * but is also valid in plain browser contexts (where we derive it from
 * `navigator.permissions` and `getUserMedia` outcomes).
 */
export type MediaPermissionStatus =
  | "granted"
  | "denied"
  | "not-determined"
  | "restricted"
  | "unknown";

export type MediaKind = "microphone" | "camera";

type ElectronMediaPermissionsAPI = {
  getStatus: (kind: MediaKind | "screen") => Promise<MediaPermissionStatus>;
  request: (kind: MediaKind) => Promise<boolean>;
  openSettings: (kind: MediaKind | "screen") => Promise<boolean>;
};

type ElectronAPI = {
  platform?: string;
  mediaPermissions?: ElectronMediaPermissionsAPI;
};

function getElectronAPI(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  return api ?? null;
}

/**
 * Probe Chromium/browser permission state without triggering a prompt.
 * `navigator.permissions.query` is the right primitive, but it's not universal
 * for media — Safari doesn't implement it, and some Chromium flags disable it.
 * We silently fall back to `"unknown"` when unsupported and let the caller
 * trigger `getUserMedia` to find out.
 */
async function queryBrowserPermission(
  kind: MediaKind,
): Promise<MediaPermissionStatus> {
  try {
    const name = (kind === "microphone" ? "microphone" : "camera") as PermissionName;
    const result = await navigator.permissions.query({ name });
    if (result.state === "granted") return "granted";
    if (result.state === "denied") return "denied";
    return "not-determined";
  } catch {
    return "unknown";
  }
}

/** One-shot getUserMedia that immediately stops tracks — used to unlock perms. */
async function probeGetUserMedia(kind: MediaKind): Promise<MediaPermissionStatus> {
  try {
    const constraints: MediaStreamConstraints =
      kind === "microphone" ? { audio: true } : { video: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch (err) {
    const name = (err as DOMException | undefined)?.name;
    if (name === "NotAllowedError" || name === "SecurityError") return "denied";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "restricted";
    return "unknown";
  }
}

/**
 * Resolve the status of a single media kind, preferring Electron's OS-level
 * TCC check and falling back to the Chromium permissions API.
 */
export async function getMediaPermissionStatus(
  kind: MediaKind,
): Promise<MediaPermissionStatus> {
  const mp = getElectronAPI()?.mediaPermissions;
  if (mp) {
    try {
      return await mp.getStatus(kind);
    } catch {
      // Fall through to the browser-level check.
    }
  }
  return queryBrowserPermission(kind);
}

/**
 * Attempt to secure access to `kind`, driving the OS prompt when possible.
 *
 * - Electron + macOS: calls TCC `askForMediaAccess`. Effective only when status
 *   was `"not-determined"`; otherwise this is a no-op and the caller should
 *   show UI pointing to System Settings.
 * - Electron + Windows/Linux: no OS gate to ask for, but we still run
 *   `getUserMedia` to make sure the hardware is actually reachable.
 * - Plain browser: triggers the tab's own permission prompt via `getUserMedia`.
 *
 * Trusts an already-`"granted"` state from the OS/browser and skips the
 * getUserMedia probe — probing can race with LiveKit's own acquisition and
 * flap to denied/unknown, which used to send users to the A/V settings dialog
 * even though the real permission was fine.
 */
export async function requestMediaPermission(
  kind: MediaKind,
): Promise<MediaPermissionStatus> {
  const mp = getElectronAPI()?.mediaPermissions;

  // Wrapping every IPC call: if the main process is running an older build
  // where these handlers aren't registered (common mid-upgrade in dev, since
  // the renderer hot-reloads but main doesn't), `ipcRenderer.invoke` rejects.
  // We don't want that to nuke the call flow — fall back to a plain browser
  // `getUserMedia`, which is what the app did before these IPCs existed.
  if (mp) {
    try {
      const status = await mp.getStatus(kind);
      if (status === "granted") return "granted";
      if (status === "denied" || status === "restricted") return status;
      // "not-determined" or "unknown" → ask the OS.
      const ok = await mp.request(kind);
      if (ok) return "granted";
      const post = await mp.getStatus(kind).catch(() => "unknown" as const);
      return post === "granted" ? "granted" : "denied";
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[useMediaPermissions] Electron IPC unavailable, falling back to getUserMedia:",
          err,
        );
      }
      // fall through to the browser-only path
    }
  }

  // Plain browser: prefer the Permissions API so we don't eat a real
  // getUserMedia acquisition when the user has already granted access.
  const browserStatus = await queryBrowserPermission(kind);
  if (browserStatus === "granted") return "granted";
  if (browserStatus === "denied") return "denied";
  // "not-determined" / "unknown" → probe so the browser shows its prompt.
  return probeGetUserMedia(kind);
}

/**
 * Pre-flight permission check for starting a call. Requests microphone (and
 * camera if `kind === "video"`) and returns a summary. Callers should check
 * `ok` and abort the call flow if it's false; the UI layer can then react
 * (e.g. open the Audio/Video Settings dialog via the broadcast event below).
 */
export const OPEN_AV_SETTINGS_EVENT = "truechats:open-av-settings";

export async function ensureCallPermissions(
  kind: "audio" | "video",
): Promise<{
  ok: boolean;
  denied: MediaKind[];
  statuses: { microphone: MediaPermissionStatus; camera: MediaPermissionStatus };
}> {
  const micPromise = requestMediaPermission("microphone");
  const camPromise =
    kind === "video"
      ? requestMediaPermission("camera")
      : Promise.resolve<MediaPermissionStatus>("granted");

  const [microphone, camera] = await Promise.all([micPromise, camPromise]);

  // Only treat an *explicit* `denied`/`restricted` as a hard block — ambiguous
  // states ("not-determined" / "unknown") shouldn't short-circuit the call,
  // because LiveKit's own getUserMedia will either prompt the user or surface
  // a clear in-call error. Previously any non-"granted" status (including
  // transient probe failures) sent users to the A/V settings dialog instead
  // of starting the call.
  const isHardBlocked = (s: MediaPermissionStatus) =>
    s === "denied" || s === "restricted";

  const denied: MediaKind[] = [];
  if (isHardBlocked(microphone)) denied.push("microphone");
  if (kind === "video" && isHardBlocked(camera)) denied.push("camera");

  const ok = denied.length === 0;

  if (!ok && typeof window !== "undefined") {
    // Let any listening UI (the A/V settings dialog) open itself with the
    // current denial state so the user lands on the fix without us building
    // a separate modal for every call site.
    window.dispatchEvent(
      new CustomEvent(OPEN_AV_SETTINGS_EVENT, {
        detail: { reason: "call-permission-denied", denied, kind },
      }),
    );
  }

  return { ok, denied, statuses: { microphone, camera } };
}

/** Deep-link the user to the correct OS privacy pane for `kind`. */
export async function openMediaSettings(kind: MediaKind | "screen"): Promise<boolean> {
  const mp = getElectronAPI()?.mediaPermissions;
  if (!mp) return false;
  try {
    return await mp.openSettings(kind);
  } catch {
    return false;
  }
}

/**
 * React hook wrapping the permission flow. Callers typically:
 *
 * 1. render `status.camera === "denied"` → show an "Open Settings" link
 * 2. on intent to use camera/mic, call `ensureAccess("camera")` which returns
 *    the resulting status; branch on `"granted"` before `getUserMedia`.
 */
export function useMediaPermissions() {
  const [micStatus, setMicStatus] = useState<MediaPermissionStatus>("unknown");
  const [cameraStatus, setCameraStatus] = useState<MediaPermissionStatus>("unknown");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const [mic, cam] = await Promise.all([
      getMediaPermissionStatus("microphone"),
      getMediaPermissionStatus("camera"),
    ]);
    if (!mountedRef.current) return;
    setMicStatus(mic);
    setCameraStatus(cam);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ensureAccess = useCallback(
    async (kind: MediaKind): Promise<MediaPermissionStatus> => {
      const next = await requestMediaPermission(kind);
      if (!mountedRef.current) return next;
      if (kind === "microphone") setMicStatus(next);
      else setCameraStatus(next);
      return next;
    },
    [],
  );

  return {
    micStatus,
    cameraStatus,
    refresh,
    ensureAccess,
    openSettings: openMediaSettings,
  };
}
