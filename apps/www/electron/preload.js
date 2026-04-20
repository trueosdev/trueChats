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
});
