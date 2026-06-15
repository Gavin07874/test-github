# AimTune AI

AimTune AI is an MVP desktop calibration tool that calculates exact controller setting changes from in-app calibration tests, safe controller telemetry, current settings, optional local performance stats, and privacy-first selected-window gameplay metrics.

## Safety Boundary

The app only uses the Browser Gamepad API, Electron selected-window capture, local IndexedDB storage, user-entered game settings, in-app calibration targets, and optional local stats. Gameplay capture stores derived metrics only, not screenshots, clips, raw frames, audio, or full-display captures. It does not read game memory, inject into games, modify game files, automate aim, automate inputs, create macros, bypass anti-cheat, bypass console security, or read console memory.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run build
npm audit --audit-level=moderate
```

## Packaging

```bash
npm run dist
```

Packaging uses `electron-builder` and is configured for future macOS and Windows distribution.
