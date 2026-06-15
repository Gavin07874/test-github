import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isAllowedDevServerUrl,
  isAllowedExternalUrl,
  isTrustedAppNavigation
} from "./security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createMainWindow() {
  const preload = path.join(__dirname, "../main/preload.cjs");
  const window = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1040,
    minHeight: 720,
    title: "AimTune AI",
    backgroundColor: "#f7f4ef",
    webPreferences: {
      preload,
      allowRunningInsecureContent: false,
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
    (_webContents, _permission, callback) => {
      callback(false);
    }
  );
  window.webContents.session.setPermissionCheckHandler(() => false);

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
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
