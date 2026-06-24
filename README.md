# AimTune AI

AimTune AI is a privacy-first desktop MVP for controller tuning. It uses controller telemetry, in-app calibration, selected-window gameplay metrics, and optional post-game stats to produce exact manual setting recommendations for Fortnite and The Last of Us Part II.

## Safety Boundary

AimTune runs locally. It does not use cloud vision, API keys, screenshots, clips, raw-frame storage, audio capture, game memory, input automation, macros, anti-cheat bypasses, or console security bypasses.

Gameplay capture uses a selected game or Remote Play window only. The app stores derived metrics, cautious candidate target signals, summaries, and recommendations.

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
