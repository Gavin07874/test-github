/// <reference types="vite/client" />

interface Window {
  aimTune?: {
    platform: NodeJS.Platform;
    storage: "indexeddb";
    nativeGameAccess: false;
  };
}
