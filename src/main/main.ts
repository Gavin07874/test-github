import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  shell,
  systemPreferences,
  type DesktopCapturerSource
} from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isAllowedDevServerUrl,
  isAllowedExternalUrl,
  isCapturableWindowSource,
  isTrustedAppNavigation,
  validateDisplayMediaRequest
} from "./security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let selectedCaptureSourceId: string | undefined;

function asSafeSource(source: DesktopCapturerSource) {
  return {
    id: source.id,
    name: source.name
  };
}

async function listWindowSources() {
  const sources = await desktopCapturer.getSources({
    types: ["window"],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false
  });
  return sources.map(asSafeSource).filter(isCapturableWindowSource);
}

function captureAccessStatus() {
  if (process.platform !== "darwin") return "granted";
  return systemPreferences.getMediaAccessStatus("screen");
}

function trustedIpcUrl(url?: string) {
  return Boolean(url && isTrustedAppNavigation(url, isDev));
}

function createMainWindow() {
  const preload = path.join(__dirname, "../main/preload.cjs");
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    title: "AimTune AI",
    backgroundColor: "#f6f2ec",
    webPreferences: {
      preload,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
      contextIsolation: true,
      devTools: isDev,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedAppNavigation(url, isDev)) {
      event.preventDefault();
    }
  });

  window.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false)
  );
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.webContents.session.setDisplayMediaRequestHandler(
    (request, callback) => {
      const decision = validateDisplayMediaRequest(
        {
          securityOrigin: request.securityOrigin,
          videoRequested: request.videoRequested,
          audioRequested: request.audioRequested,
          userGesture: request.userGesture,
          selectedSourceId: selectedCaptureSourceId
        },
        isDev
      );

      if (!decision.allowed) {
        callback({});
        return;
      }

      void listWindowSources()
        .then((sources) => {
          const source = sources.find((item) => item.id === selectedCaptureSourceId);
          if (!source) {
            selectedCaptureSourceId = undefined;
            callback({});
            return;
          }
          callback({ video: source });
        })
        .catch(() => {
          selectedCaptureSourceId = undefined;
          callback({});
        });
    },
    { useSystemPicker: false }
  );

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    if (!isAllowedDevServerUrl(process.env.VITE_DEV_SERVER_URL)) {
      throw new Error("Refusing to load an untrusted development server URL.");
    }
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void window.loadFile(path.join(__dirname, "../../dist/index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("capture:list-window-sources", async (event) => {
    if (!trustedIpcUrl(event.senderFrame?.url)) return [];
    return listWindowSources();
  });

  ipcMain.handle("capture:select-source", async (event, sourceId: unknown) => {
    if (!trustedIpcUrl(event.senderFrame?.url)) return false;
    if (typeof sourceId !== "string") return false;
    const sources = await listWindowSources();
    const exists = sources.some((source) => source.id === sourceId);
    selectedCaptureSourceId = exists ? sourceId : undefined;
    return exists;
  });

  ipcMain.handle("capture:screen-access-status", (event) => {
    if (!trustedIpcUrl(event.senderFrame?.url)) return "denied";
    return captureAccessStatus();
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
