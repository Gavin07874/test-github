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
      screenAccessStatus: () => ipcRenderer.invoke("capture:screen-access-status")
    })
  })
);
