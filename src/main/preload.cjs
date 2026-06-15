const { contextBridge } = require("electron");

const aimTuneInfo = Object.freeze({
  platform: process.platform,
  storage: "indexeddb",
  nativeGameAccess: false
});

contextBridge.exposeInMainWorld("aimTune", aimTuneInfo);
