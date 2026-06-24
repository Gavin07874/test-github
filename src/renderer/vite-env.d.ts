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
        armStart: (sourceId: string) => Promise<boolean>;
        screenAccessStatus: () => Promise<
          "not-determined" | "granted" | "denied" | "restricted" | "unknown"
        >;
        diagnostics: () => Promise<{
          screenAccessStatus: "not-determined" | "granted" | "denied" | "restricted" | "unknown";
          selectedSourceId?: string;
          startArmed: boolean;
          lastDecision?: {
            phase: string;
            allowed: boolean;
            reason: string;
          };
        }>;
        openScreenSettings: () => Promise<boolean>;
      };
    };
  }
}

export {};
