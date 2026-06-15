import { describe, expect, it } from "vitest";
import {
  calculateConfidence,
  hasConflictingMetrics
} from "../services/confidenceEngine";
import type { CalibrationMetrics, Session } from "../types";

const sessions: Session[] = [1, 2, 3].map((index) => ({
  id: `session-${index}`,
  mode: "pc",
  platform: "pc",
  gameName: "Fortnite",
  startedAt: new Date(index).toISOString(),
  hasControllerTelemetry: true
}));

const metrics: CalibrationMetrics = {
  id: "metrics-1",
  sessionId: "session-1",
  leftStickDriftAverage: 0.01,
  leftStickDriftMax: 0.02,
  rightStickDriftAverage: 0.04,
  rightStickDriftMax: 0.05,
  microAimOvershootRate: 28,
  microAimUndershootRate: 4,
  microAimSettleTime: 320,
  microAimJitter: 0.08,
  microAimAccuracy: 76,
  flickReactionTime: 210,
  flickOvershootRate: 18,
  flickUndershootRate: 8,
  flickSettleTime: 340,
  maxStickUsagePercent: 34,
  trackingErrorAverage: 0.12,
  trackingErrorMax: 0.2,
  trackingSmoothness: 82,
  trackingJitter: 0.06,
  targetLossCount: 0,
  maxStickTimePercent: 20,
  turnSpeedConsistency: 78,
  turnCorrectionCount: 2,
  adsJitter: 0.07,
  adsOvershootRate: 10,
  adsTrackingError: 0.1,
  firingStabilityScore: 86
};

describe("confidenceEngine", () => {
  it("scores full calibration plus three telemetry sessions in the high confidence range", () => {
    const score = calculateConfidence({
      mode: "pc",
      sessions,
      calibrationMetrics: metrics,
      hasControllerTelemetry: true
    });

    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("scores missing telemetry lower", () => {
    const score = calculateConfidence({
      mode: "pc",
      sessions: [sessions[0]],
      hasControllerTelemetry: false
    });

    expect(score).toBeLessThanOrEqual(40);
  });

  it("detects and penalizes conflicting overshoot and undershoot metrics", () => {
    const conflicting = {
      ...metrics,
      microAimOvershootRate: 40,
      flickUndershootRate: 42
    };

    expect(hasConflictingMetrics(conflicting)).toBe(true);

    const cleanScore = calculateConfidence({
      mode: "pc",
      sessions,
      calibrationMetrics: metrics,
      hasControllerTelemetry: true
    });
    const conflictScore = calculateConfidence({
      mode: "pc",
      sessions,
      calibrationMetrics: conflicting,
      hasControllerTelemetry: true
    });

    expect(conflictScore).toBeLessThan(cleanScore);
  });
});
