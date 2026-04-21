const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  /**
   * Show a native OS notification. `subtitle` is macOS-only.
   * @param {{ title?: string; subtitle?: string; body?: string; silent?: boolean }} options
   */
  notify: (options) => ipcRenderer.invoke("notify", options),
  /** macOS-only: set the dock badge count (0 clears). No-op elsewhere. */
  setBadgeCount: (count) => ipcRenderer.invoke("set-badge-count", count),
  /** macOS-only: bounce the dock icon. `type` is "informational" (default) or "critical". */
  bounceDock: (type) => ipcRenderer.invoke("bounce-dock", type),
  /**
   * Subscribe to `update-available` from electron-updater. Returns an unsubscribe function.
   * @param {(payload: { version: string }) => void} callback
   */
  onUpdateAvailable: (callback) => {
    const channel = "app-update-available";
    const handler = (_event, payload) => {
      callback(payload ?? { version: "" });
    };
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  /** Download the pending update and restart the app (packaged builds only). */
  downloadAndInstallUpdate: () => ipcRenderer.invoke("electron-download-and-install-update"),
  /**
   * Subscribe to native notification clicks. The payload is the `data` object
   * passed to `notify(...)` — used by the renderer to route the user to the
   * conversation/thread that triggered the notification.
   * @param {(data: unknown) => void} callback
   * @returns {() => void} unsubscribe
   */
  onNotificationClick: (callback) => {
    const channel = "notification-clicked";
    const handler = (_event, payload) => {
      callback(payload);
    };
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },

  /**
   * macOS TCC / Windows Privacy Settings helpers. On Linux these resolve
   * as if permission is granted and the renderer should fall back to the
   * browser's own `getUserMedia` flow.
   *
   * `kind` is "microphone" | "camera" | "screen".
   */
  mediaPermissions: {
    /** @returns {Promise<"granted"|"denied"|"not-determined"|"restricted"|"unknown">} */
    getStatus: (kind) => ipcRenderer.invoke("media-permission:status", kind),
    /**
     * Fire the macOS TCC prompt. Resolves `true` once access is granted.
     * If status is already `denied`, resolves `false` without prompting —
     * call `openSettings(kind)` to deep-link the user to the correct pane.
     * @returns {Promise<boolean>}
     */
    request: (kind) => ipcRenderer.invoke("media-permission:request", kind),
    /** @returns {Promise<boolean>} */
    openSettings: (kind) =>
      ipcRenderer.invoke("media-permission:open-settings", kind),
  },
});
