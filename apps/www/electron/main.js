const {
  app,
  BrowserWindow,
  Menu,
  shell,
  session,
  systemPreferences,
  desktopCapturer,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const iconPath = path.join(__dirname, "icons", "icon.png");

const APP_NAME = "trueChats";
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

/** Permissions we allow for our own UI (LiveKit / getUserMedia / getDisplayMedia). */
const GRANTED_PERMISSIONS = new Set([
  "media",
  "display-capture",
  "speaker-selection",
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

  Menu.setApplicationMenu(buildMenu());

  if (process.platform === "darwin") {
    app.dock.setIcon(iconPath);
  }

  createWindow();

  // In packaged builds, check for updates from the configured provider.
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;

    autoUpdater.on("update-downloaded", () => {
      autoUpdater.quitAndInstall();
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
