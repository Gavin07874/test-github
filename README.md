# AimTune AI

AimTune AI is an MVP desktop calibration tool that calculates exact controller setting changes from in-app calibration tests, safe controller telemetry, gameplay session input data, current settings, and optional post-game stats.

## Safety Boundary

The app only uses the Browser Gamepad API, local IndexedDB storage, user-entered game settings, in-app calibration targets, and post-game stats. It does not read game memory, inject into games, modify game files, automate aim, automate inputs, create macros, bypass anti-cheat, bypass console security, or read console memory.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run build
```

## Packaging

```bash
npm run dist
```

Packaging uses `electron-builder` and is configured for future macOS and Windows distribution.
