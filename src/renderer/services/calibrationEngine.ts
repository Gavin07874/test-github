import type {
  CalibrationMetrics,
  CalibrationSample,
  CalibrationTestDefinition,
  CalibrationTestId,
  GamepadSnapshot
} from "../types";
import { pressedButtonIndexes } from "./gamepadService";

export const calibrationTests: CalibrationTestDefinition[] = [
  {
    id: "drift",
    title: "Controller Drift Test",
    durationSeconds: 10,
    objective: "Set the controller down. Do not touch either stick.",
    metricsCollected: [
      "Left drift avg",
      "Left drift max",
      "Right drift avg",
      "Right drift max"
    ],
    telemetryRequired: true
  },
  {
    id: "micro",
    title: "Micro-Aim Test",
    durationSeconds: 12,
    objective: "Make tiny controlled adjustments near center.",
    metricsCollected: [
      "Overshoot",
      "Undershoot",
      "Settle time",
      "Jitter",
      "Accuracy"
    ],
    telemetryRequired: true
  },
  {
    id: "flick",
    title: "Flick Target Test",
    durationSeconds: 15,
    objective: "Snap to each random target as it appears.",
    metricsCollected: [
      "Reaction time",
      "Overshoot",
      "Undershoot",
      "Settle time",
      "Max stick usage"
    ],
    telemetryRequired: true
  },
  {
    id: "tracking",
    title: "Tracking Test",
    durationSeconds: 15,
    objective: "Track the moving target smoothly.",
    metricsCollected: [
      "Avg tracking error",
      "Max tracking error",
      "Smoothness",
      "Jitter",
      "Target losses"
    ],
    telemetryRequired: true
  },
  {
    id: "turn",
    title: "Turn-Speed Test",
    durationSeconds: 10,
    objective: "Make fast left and right turns on cue.",
    metricsCollected: [
      "Max-stick time",
      "Turn consistency",
      "Corrections"
    ],
    telemetryRequired: true
  },
  {
    id: "ads",
    title: "ADS Stability Test",
    durationSeconds: 12,
    objective: "Hold ADS and keep the reticle stable.",
    metricsCollected: [
      "ADS jitter",
      "ADS overshoot",
      "ADS tracking error",
      "Firing stability score"
    ],
    telemetryRequired: true
  }
];

export function createCalibrationSample(
  testId: CalibrationTestId,
  snapshot: GamepadSnapshot,
  startedAt: number,
  target?: { x: number; y: number },
  reticle?: { x: number; y: number }
): CalibrationSample {
  return {
    testId,
    timestamp: Date.now(),
    elapsedMs: Math.max(0, Date.now() - startedAt),
    leftStickX: snapshot.leftStickX,
    leftStickY: snapshot.leftStickY,
    rightStickX: snapshot.rightStickX,
    rightStickY: snapshot.rightStickY,
    leftTrigger: snapshot.leftTrigger,
    rightTrigger: snapshot.rightTrigger,
    buttons: pressedButtonIndexes(snapshot),
    targetX: target?.x,
    targetY: target?.y,
    reticleX: reticle?.x,
    reticleY: reticle?.y
  };
}

function magnitude(x: number, y: number) {
  return Math.hypot(x, y);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function max(values: number[]) {
  return values.length ? Math.max(...values) : 0;
}

function percent(count: number, total: number) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

function jitterFrom(samples: CalibrationSample[], xKey: "rightStickX" | "reticleX", yKey: "rightStickY" | "reticleY") {
  const deltas: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const previousX = previous[xKey] ?? 0;
    const previousY = previous[yKey] ?? 0;
    const currentX = current[xKey] ?? 0;
    const currentY = current[yKey] ?? 0;
    deltas.push(magnitude(currentX - previousX, currentY - previousY));
  }
  return Number(average(deltas).toFixed(3));
}

function countDirectionChanges(samples: CalibrationSample[]) {
  let changes = 0;
  let lastSign = 0;

  for (const sample of samples) {
    const sign = Math.sign(sample.rightStickX);
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) {
      changes += 1;
    }
    if (sign !== 0) lastSign = sign;
  }

  return changes;
}

function firstMovementMs(samples: CalibrationSample[], threshold = 0.35) {
  const found = samples.find(
    (sample) => magnitude(sample.rightStickX, sample.rightStickY) >= threshold
  );
  return found?.elapsedMs ?? 0;
}

function settleTimeMs(samples: CalibrationSample[]) {
  const moving = samples.filter(
    (sample) => magnitude(sample.rightStickX, sample.rightStickY) > 0.25
  );
  if (!moving.length) return 0;
  return moving[moving.length - 1].elapsedMs - moving[0].elapsedMs;
}

function targetErrors(samples: CalibrationSample[]) {
  return samples
    .filter(
      (sample) =>
        sample.targetX !== undefined &&
        sample.targetY !== undefined &&
        sample.reticleX !== undefined &&
        sample.reticleY !== undefined
    )
    .map((sample) =>
      magnitude(
        (sample.targetX ?? 0) - (sample.reticleX ?? 0),
        (sample.targetY ?? 0) - (sample.reticleY ?? 0)
      )
    );
}

export function calculateCalibrationMetrics(
  sessionId: string,
  samplesByTest: Partial<Record<CalibrationTestId, CalibrationSample[]>>
): CalibrationMetrics {
  const drift = samplesByTest.drift ?? [];
  const micro = samplesByTest.micro ?? [];
  const flick = samplesByTest.flick ?? [];
  const tracking = samplesByTest.tracking ?? [];
  const turn = samplesByTest.turn ?? [];
  const ads = samplesByTest.ads ?? [];

  const leftDrift = drift.map((sample) =>
    magnitude(sample.leftStickX, sample.leftStickY)
  );
  const rightDrift = drift.map((sample) =>
    magnitude(sample.rightStickX, sample.rightStickY)
  );

  const microDirectionChanges = countDirectionChanges(micro);
  const microMagnitudes = micro.map((sample) =>
    magnitude(sample.rightStickX, sample.rightStickY)
  );
  const microErrors = targetErrors(micro);

  const flickDirectionChanges = countDirectionChanges(flick);
  const flickMagnitudes = flick.map((sample) =>
    magnitude(sample.rightStickX, sample.rightStickY)
  );

  const trackingErrors = targetErrors(tracking);
  const trackingJitter = jitterFrom(tracking, "reticleX", "reticleY");

  const turnMagnitudes = turn.map((sample) =>
    magnitude(sample.rightStickX, sample.rightStickY)
  );
  const turnHighStick = turnMagnitudes.filter((value) => value >= 0.85).length;

  const adsActive = ads.filter(
    (sample) => sample.leftTrigger > 0.35 || sample.buttons.includes(6)
  );
  const adsErrors = targetErrors(adsActive.length ? adsActive : ads);
  const adsJitter = jitterFrom(adsActive.length ? adsActive : ads, "rightStickX", "rightStickY");

  return {
    id: crypto.randomUUID(),
    sessionId,
    leftStickDriftAverage: Number(average(leftDrift).toFixed(3)),
    leftStickDriftMax: Number(max(leftDrift).toFixed(3)),
    rightStickDriftAverage: Number(average(rightDrift).toFixed(3)),
    rightStickDriftMax: Number(max(rightDrift).toFixed(3)),
    microAimOvershootRate: percent(microDirectionChanges, Math.max(1, micro.length / 8)),
    microAimUndershootRate: percent(
      microMagnitudes.filter((value) => value > 0 && value < 0.22).length,
      micro.length
    ),
    microAimSettleTime: settleTimeMs(micro),
    microAimJitter: jitterFrom(micro, "rightStickX", "rightStickY"),
    microAimAccuracy: Number(
      Math.max(0, 100 - average(microErrors) * 130).toFixed(1)
    ),
    flickReactionTime: firstMovementMs(flick),
    flickOvershootRate: percent(flickDirectionChanges, Math.max(1, flick.length / 12)),
    flickUndershootRate: percent(
      flickMagnitudes.filter((value) => value > 0 && value < 0.35).length,
      flick.length
    ),
    flickSettleTime: settleTimeMs(flick),
    maxStickUsagePercent: percent(
      flickMagnitudes.filter((value) => value >= 0.85).length,
      flick.length
    ),
    trackingErrorAverage: Number(average(trackingErrors).toFixed(3)),
    trackingErrorMax: Number(max(trackingErrors).toFixed(3)),
    trackingSmoothness: Number(Math.max(0, 100 - trackingJitter * 100).toFixed(1)),
    trackingJitter,
    targetLossCount: trackingErrors.filter((value) => value > 0.35).length,
    maxStickTimePercent: percent(turnHighStick, turn.length),
    turnSpeedConsistency: Number(
      Math.max(0, 100 - jitterFrom(turn, "rightStickX", "rightStickY") * 100).toFixed(1)
    ),
    turnCorrectionCount: countDirectionChanges(turn),
    adsJitter,
    adsOvershootRate: percent(countDirectionChanges(ads), Math.max(1, ads.length / 10)),
    adsTrackingError: Number(average(adsErrors).toFixed(3)),
    firingStabilityScore: Number(Math.max(0, 100 - adsJitter * 140).toFixed(1))
  };
}

export function completedCalibrationCount(
  samplesByTest: Partial<Record<CalibrationTestId, CalibrationSample[]>>
) {
  return calibrationTests.filter((test) => (samplesByTest[test.id]?.length ?? 0) > 0)
    .length;
}
