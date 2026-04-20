const {
  app,
  BrowserWindow,
  Menu,
  Notification,
  ipcMain,
  shell,
  session,
  systemPreferences,
  desktopCapturer,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const iconPath = path.join(__dirname, "icons", "icon.png");

const APP_NAME = "trueChats";
// Windows uses this ID to group notifications/taskbar icons. Must be set before any Notification is shown.
const APP_USER_MODEL_ID = "dev.trueos.chats";
const PROD_URL = process.env.ELECTRON_START_URL || "https://chats.trueos.dev";

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: APP_NAME,
            submenu: [
              { role: "about", label: `About ${APP_NAME}` },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide", label: `Hide ${APP_NAME}` },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit", label: `Quit ${APP_NAME}` },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" },
              { role: "delete" },
              { role: "selectAll" },
            ]
          : [
              { role: "delete" },
              { type: "separator" },
              { role: "selectAll" },
            ]),
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: `${APP_NAME} Website`,
          click: () => shell.openExternal("https://truechats.com"),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

function createWindow() {
  const isMac = process.platform === "darwin";

  const win = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    icon: iconPath,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const startUrl = app.isPackaged ? PROD_URL : "http://localhost:3000";
  win.loadURL(startUrl);

  // macOS TCC prompts are much more reliable once a visible window exists (especially in dev).
  win.once("ready-to-show", () => {
    void ensureMacOSMediaAccess();
  });
}

app.setName(APP_NAME);
if (process.platform === "win32") {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

/**
 * Focus the main window (restore if minimized). Used as the click handler on notifications
 * so the user lands on the app when they click through.
 */
function focusMainWindow() {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length === 0) return;
  const win = wins[0];
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/**
 * Show a native OS notification. Safe to call on any platform; no-ops when unsupported.
 * Payload: { title, subtitle?, body, silent? }
 *
 * `subtitle` only renders on macOS (displays between the title and body, bolder than body);
 * on Windows/Linux it's silently ignored by Chromium's notification layer.
 */
function showNativeNotification(payload) {
  try {
    if (!Notification.isSupported()) {
      console.warn("[electron] Notification.isSupported() = false — OS integration unavailable.");
      return;
    }
    const isMac = process.platform === "darwin";
    const { title, subtitle, body, silent } = payload || {};
    const notification = new Notification({
      title: title || APP_NAME,
      ...(isMac && subtitle ? { subtitle } : {}),
      body: body || "",
      icon: iconPath,
      silent: Boolean(silent),
      // macOS: use the default system "new message" sound when not silent.
      ...(isMac && !silent ? { sound: "default" } : {}),
    });
    notification.on("click", focusMainWindow);
    // `failed` fires when macOS/Chromium refuses the notification — almost always
    // an OS-level permission issue (System Settings → Notifications → trueChats).
    notification.on("failed", (_event, err) => {
      console.warn(
        "[electron] notification refused by OS (likely a System Settings permission issue):",
        err,
      );
    });
    notification.on("show", () => {
      if (process.env.ELECTRON_DEBUG_NOTIFICATIONS) {
        console.log("[electron] notification shown:", title);
      }
    });
    notification.show();
  } catch (e) {
    console.warn("[electron] notification failed:", e?.message ?? e);
  }
}

ipcMain.handle("notify", (_event, payload) => {
  showNativeNotification(payload);
  return true;
});

/**
 * macOS dock badge: shows an unread count pill on the dock icon.
 * Pass 0 (or negative) to clear. No-op on other platforms.
 */
ipcMain.handle("set-badge-count", (_event, count) => {
  if (process.platform !== "darwin") return false;
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  try {
    app.dock?.setBadge?.(n > 0 ? String(n) : "");
    return true;
  } catch (e) {
    console.warn("[electron] set-badge-count failed:", e?.message ?? e);
    return false;
  }
});

/**
 * macOS dock bounce ("critical" = bounce until clicked, "informational" = one bounce).
 * No-op on other platforms.
 */
ipcMain.handle("bounce-dock", (_event, type) => {
  if (process.platform !== "darwin") return -1;
  try {
    return app.dock?.bounce?.(type === "critical" ? "critical" : "informational") ?? -1;
  } catch (e) {
    console.warn("[electron] bounce-dock failed:", e?.message ?? e);
    return -1;
  }
});

function broadcastToRenderer(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send(channel, payload);
    } catch (e) {
      console.warn("[electron] broadcast failed:", channel, e?.message ?? e);
    }
  }
}

/**
 * Download the pending update (after `update-available`) and restart into the new build.
 * Renderer should only call this after the user confirms.
 */
ipcMain.handle("electron-download-and-install-update", async () => {
  if (!app.isPackaged) {
    return { ok: false, error: "Updates only apply to packaged builds." };
  }
  try {
    await autoUpdater.downloadUpdate();
    setImmediate(() => {
      try {
        autoUpdater.quitAndInstall();
      } catch (e) {
        console.warn("[electron] quitAndInstall failed:", e?.message ?? e);
      }
    });
    return { ok: true };
  } catch (e) {
    const msg = e?.message ?? String(e);
    console.warn("[electron] downloadUpdate failed:", msg);
    return { ok: false, error: msg };
  }
});

/**
 * Permissions we allow for our own UI.
 * - media / display-capture / speaker-selection: LiveKit + getUserMedia + getDisplayMedia.
 * - notifications: required so Chromium doesn't deny `Notification.requestPermission()`
 *   in production (served from https://chats.trueos.dev). Without this the renderer
 *   gets permission="denied" and we never reach the OS notification layer — which was
 *   the exact reason production builds appeared to "not show notifications" despite
 *   dev working fine (localhost is auto-granted by Chromium).
 */
const GRANTED_PERMISSIONS = new Set([
  "media",
  "display-capture",
  "speaker-selection",
  "notifications",
]);

/**
 * Grant Chromium media permissions so getUserMedia / LiveKit can run.
 * Single-window app loads only our UI (localhost in dev; set loadURL for prod).
 */
function setupMediaPermissions() {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      if (GRANTED_PERMISSIONS.has(permission)) {
        callback(true);
        return;
      }
      // Optional: log unknown permission once while debugging new Chromium features
      if (permission && process.env.ELECTRON_DEBUG_PERMISSIONS) {
        console.log("[electron] permission request:", permission, details);
      }
      callback(false);
    },
  );

  // Note: Electron's typings omit `display-capture` here, but Chromium still performs checks.
  ses.setPermissionCheckHandler((_webContents, permission) => {
    if (GRANTED_PERMISSIONS.has(permission)) {
      return true;
    }
    return undefined;
  });
}

/**
 * Required for navigator.mediaDevices.getDisplayMedia (screen share) in Electron.
 * - macOS: prefer native system picker when available (macOS 15+).
 * - Other platforms: grant the primary display / first source so sharing works (no built-in picker).
 */
function setupDisplayMediaHandler() {
  const ses = session.defaultSession;

  ses.setDisplayMediaRequestHandler(
    async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen", "window"],
          fetchWindowIcons: true,
          thumbnailSize: { width: 200, height: 200 },
        });

        if (sources.length === 0) {
          callback({});
          return;
        }

        const primary =
          sources.find((s) => s.id.startsWith("screen:")) ?? sources[0];

        const streams = {
          video: { id: primary.id, name: primary.name },
        };

        if (request.audioRequested && process.platform === "win32") {
          streams.audio = "loopback";
        }

        callback(streams);
      } catch (e) {
        console.warn("[electron] display media handler:", e?.message ?? e);
        callback({});
      }
    },
    // Experimental: native screen/window picker on supported macOS versions; handler may not run.
    process.platform === "darwin" ? { useSystemPicker: true } : {},
  );
}

/**
 * macOS: trigger TCC prompts so the app appears in Privacy → Microphone / Camera.
 * Electron’s in-page prompt alone is often not enough for the OS gate.
 */
async function ensureMacOSMediaAccess() {
  if (process.platform !== "darwin") return;

  const micStatus = systemPreferences.getMediaAccessStatus?.("microphone");
  const camStatus = systemPreferences.getMediaAccessStatus?.("camera");
  if (process.env.ELECTRON_DEBUG_PERMISSIONS) {
    console.log("[electron] media status before ask:", { micStatus, camStatus });
  }

  try {
    const mic = await systemPreferences.askForMediaAccess("microphone");
    if (process.env.ELECTRON_DEBUG_PERMISSIONS) {
      console.log("[electron] askForMediaAccess(microphone) =>", mic);
    }
  } catch (e) {
    console.warn("[electron] microphone access request:", e?.message ?? e);
  }
  try {
    const cam = await systemPreferences.askForMediaAccess("camera");
    if (process.env.ELECTRON_DEBUG_PERMISSIONS) {
      console.log("[electron] askForMediaAccess(camera) =>", cam);
    }
  } catch (e) {
    console.warn("[electron] camera access request:", e?.message ?? e);
  }
}

app.whenReady().then(async () => {
  setupMediaPermissions();
  setupDisplayMediaHandler();

  // macOS: system menu bar. Windows: hide the in-window File/Edit/View bar.
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(buildMenu());
  } else if (process.platform === "win32") {
    Menu.setApplicationMenu(null);
  } else {
    Menu.setApplicationMenu(buildMenu());
  }

  if (process.platform === "darwin") {
    app.dock.setIcon(iconPath);
  }

  createWindow();

  // In packaged builds, check for updates from the configured provider.
  if (app.isPackaged) {
    autoUpdater.autoDownload = false;

    autoUpdater.on("update-available", (info) => {
      const version = info?.version != null ? String(info.version) : "";
      broadcastToRenderer("app-update-available", { version });
    });

    autoUpdater.checkForUpdates().catch((err) => {
      console.warn("[electron] auto-update check failed:", err?.message ?? err);
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
