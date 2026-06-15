/// <reference types="vite/client" />

import type { CapturableWindowSource } from "./types";

declare global {
  interface Window {
    aimTune?: {
      platform: NodeJS.Platform;
      storage: "indexeddb";
      nativeGameAccess: false;
      capture?: {
        listWindowSources: () => Promise<CapturableWindowSource[]>;
        selectSource: (sourceId: string) => Promise<boolean>;
        screenAccessStatus: () => Promise<
          "not-determined" | "granted" | "denied" | "restricted" | "unknown"
        >;
      };
    };
  }
}

export {};
