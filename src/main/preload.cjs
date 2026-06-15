const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
  "aimTune",
  Object.freeze({
    platform: process.platform,
    storage: "indexeddb",
    nativeGameAccess: false,
    capture: Object.freeze({
      listWindowSources: () => ipcRenderer.invoke("capture:list-window-sources"),
      selectSource: (sourceId) => ipcRenderer.invoke("capture:select-source", sourceId),
      armStart: (sourceId) => ipcRenderer.invoke("capture:arm-start", sourceId),
      screenAccessStatus: () => ipcRenderer.invoke("capture:screen-access-status"),
      diagnostics: () => ipcRenderer.invoke("capture:diagnostics"),
      openScreenSettings: () => ipcRenderer.invoke("capture:open-screen-settings")
    })
  })
);
