import type {
  CalibrationMetric,
  CalibrationMode,
  CalibrationTest,
  CalibrationTestId,
  ControllerSample,
  GameId
} from "../types";
import { makeId } from "./id";

export const calibrationTests: CalibrationTest[] = [
  {
    id: "drift",
    name: "Controller Drift Test",
    purpose: "Measure resting stick movement.",
    instructions: "Set the controller down and do not touch either stick.",
    durationSeconds: 4,
    metrics: ["Drift average", "Drift max"]
  },
  {
    id: "micro",
    name: "Micro-Aim Test",
    purpose: "Measure small correction stability.",
    instructions: "Use the right stick to make small controlled moves around center.",
    durationSeconds: 6,
    metrics: ["Overshoot", "Undershoot", "Jitter", "Accuracy"]
  },
  {
    id: "flick",
    name: "Flick Target Test",
    purpose: "Measure snap correction behavior.",
    instructions: "Snap to each target and release pressure when centered.",
    durationSeconds: 6,
    metrics: ["Overshoot", "Undershoot", "Settle time"]
  },
  {
    id: "tracking",
    name: "Tracking Test",
    purpose: "Measure smooth target following.",
    instructions: "Track the moving target smoothly without overcorrecting.",
    durationSeconds: 8,
    metrics: ["Tracking error", "Smoothness"]
  },
  {
    id: "turn",
    name: "Turn-Speed Test",
    purpose: "Measure max-stick consistency during turns.",
    instructions: "Follow the side-to-side targets with fast camera turns.",
    durationSeconds: 7,
    metrics: ["Turn consistency", "Max input percent"]
  },
  {
    id: "ads",
    name: "ADS Stability Test",
    purpose: "Measure aim stability while ADS and firing.",
    instructions: "Hold aim and fire triggers while keeping the reticle stable.",
    durationSeconds: 7,
    metrics: ["ADS jitter", "Firing stability"]
  }
];

export const calibrationModes: Record<CalibrationMode, CalibrationTestId[]> = {
  quick: ["drift", "micro", "flick"],
  full: ["drift", "micro", "flick", "tracking", "turn", "ads"]
};

export interface CalibrationSample extends ControllerSample {
  testId: CalibrationTestId;
  targetX: number;
  targetY: number;
  reticleX: number;
  reticleY: number;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percent(values: number[], predicate: (value: number) => boolean) {
  if (!values.length) return 0;
  return Number(((values.filter(predicate).length / values.length) * 100).toFixed(1));
}

function distance(sample: CalibrationSample) {
  return Math.hypot(sample.targetX - sample.reticleX, sample.targetY - sample.reticleY);
}

function stickMagnitude(sample: ControllerSample) {
  return Math.min(1, Math.hypot(sample.rightX, sample.rightY));
}

export function testsForMode(mode: CalibrationMode) {
  const ids = new Set(calibrationModes[mode]);
  return calibrationTests.filter((test) => ids.has(test.id));
}

export function targetForTest(testId: CalibrationTestId, elapsedMs: number) {
  const seconds = elapsedMs / 1000;
  if (testId === "drift") return { x: 0.5, y: 0.5 };
  if (testId === "micro") return { x: 0.5 + Math.sin(seconds * 2) * 0.12, y: 0.5 + Math.cos(seconds * 1.7) * 0.1 };
  if (testId === "flick") {
    const step = Math.floor(seconds * 1.3);
    return { x: 0.18 + ((step * 37) % 64) / 100, y: 0.2 + ((step * 53) % 58) / 100 };
  }
  if (testId === "tracking") return { x: 0.5 + Math.sin(seconds * 1.2) * 0.3, y: 0.5 + Math.cos(seconds * 0.85) * 0.23 };
  if (testId === "turn") return { x: seconds % 2 < 1 ? 0.12 : 0.88, y: 0.5 };
  return { x: 0.5 + Math.sin(seconds * 1.1) * 0.18, y: 0.5 + Math.cos(seconds * 1.5) * 0.16 };
}

export function calculateCalibrationMetric(
  runId: string,
  gameId: GameId,
  mode: CalibrationMode,
  samples: CalibrationSample[]
): CalibrationMetric {
  const byTest = (testId: CalibrationTestId) => samples.filter((sample) => sample.testId === testId);
  const drift = byTest("drift").map(stickMagnitude);
  const microError = byTest("micro").map(distance);
  const flickError = byTest("flick").map(distance);
  const trackingError = byTest("tracking").map(distance);
  const turnMagnitudes = byTest("turn").map(stickMagnitude);
  const adsSamples = byTest("ads");
  const adsError = adsSamples.map(distance);
  const fireActive = adsSamples.filter((sample) => sample.rightTrigger > 0.35);

  return {
    id: makeId("calibration-metric"),
    runId,
    gameId,
    mode,
    createdAt: new Date().toISOString(),
    sampleCount: samples.length,
    driftAverage: Number(average(drift).toFixed(4)),
    driftMax: Number(Math.max(0, ...drift).toFixed(4)),
    microOvershootRate: percent(microError, (value) => value > 0.2),
    microUndershootRate: percent(byTest("micro").map(stickMagnitude), (value) => value > 0.68),
    microJitter: Number(average(microError.map((value, index, all) => Math.abs(value - (all[index - 1] ?? value)))).toFixed(4)),
    microAccuracy: Number(Math.max(0, 100 - average(microError) * 180).toFixed(1)),
    flickOvershootRate: percent(flickError, (value) => value > 0.24),
    flickUndershootRate: percent(byTest("flick").map(stickMagnitude), (value) => value > 0.75),
    flickSettleMs: Math.round(220 + average(flickError) * 900),
    trackingError: Number(average(trackingError).toFixed(4)),
    trackingSmoothness: Number(Math.max(0, 100 - average(trackingError) * 140).toFixed(1)),
    turnConsistency: Number(Math.max(0, 100 - average(turnMagnitudes.map((value) => Math.abs(0.85 - value))) * 120).toFixed(1)),
    maxTurnInputPercent: percent(turnMagnitudes, (value) => value > 0.85),
    adsJitter: Number(average(adsError.map((value, index, all) => Math.abs(value - (all[index - 1] ?? value)))).toFixed(4)),
    firingStability: Number(Math.max(0, 100 - average(fireActive.map(distance)) * 160).toFixed(1))
  };
}
