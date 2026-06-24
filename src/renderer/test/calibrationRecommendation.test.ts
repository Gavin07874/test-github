import { describe, expect, it } from "vitest";
import { cloneDefaults } from "../data/gameProfiles";
import { calculateCalibrationMetric, type CalibrationSample } from "../services/calibrationEngine";
import { generateRecommendations } from "../services/recommendationEngine";
import type { AnalysisSummary, CalibrationMetric } from "../types";

function sample(testId: CalibrationSample["testId"], overrides: Partial<CalibrationSample> = {}): CalibrationSample {
  return {
    id: `s-${testId}`,
    sessionId: "run-1",
    timestamp: Date.now(),
    connected: true,
    leftX: 0,
    leftY: 0,
    rightX: 0.8,
    rightY: 0.1,
    leftTrigger: testId === "ads" ? 0.8 : 0,
    rightTrigger: testId === "ads" ? 0.8 : 0,
    buttons: [],
    testId,
    targetX: 0.5,
    targetY: 0.5,
    reticleX: 0.82,
    reticleY: 0.5,
    ...overrides
  };
}

const calibration: CalibrationMetric = {
  id: "metric-1",
  runId: "run-1",
  gameId: "fortnite",
  mode: "full",
  createdAt: new Date().toISOString(),
  sampleCount: 180,
  driftAverage: 0.08,
  driftMax: 0.12,
  microOvershootRate: 42,
  microUndershootRate: 4,
  microJitter: 0.08,
  microAccuracy: 72,
  flickOvershootRate: 36,
  flickUndershootRate: 8,
  flickSettleMs: 430,
  trackingError: 0.12,
  trackingSmoothness: 82,
  turnConsistency: 78,
  maxTurnInputPercent: 20,
  adsJitter: 0.16,
  firingStability: 64
};

const analysis: AnalysisSummary = {
  id: "summary-1",
  captureSessionId: "capture-1",
  sampleCount: 60,
  detectionCount: 18,
  averageStability: 58,
  averageCenterMotion: 31,
  averageTargetProximity: 24,
  controllerScreenCorrelation: 62,
  adsInstability: 34,
  firingInstability: 37,
  targetSignalConfidence: 64,
  modelStatus: "ready",
  confidenceContribution: 16
};

describe("calibration and recommendations", () => {
  it("calculates calibration metrics from samples", () => {
    const metric = calculateCalibrationMetric("run-1", "fortnite", "quick", [
      sample("drift", { rightX: 0.02, rightY: 0.01, reticleX: 0.5 }),
      sample("micro"),
      sample("flick")
    ]);

    expect(metric.sampleCount).toBe(3);
    expect(metric.driftAverage).toBeGreaterThan(0);
    expect(metric.microOvershootRate).toBeGreaterThan(0);
  });

  it("does not recommend settings before calibration", () => {
    expect(
      generateRecommendations({
        gameId: "fortnite",
        mode: "pc",
        settings: cloneDefaults("fortnite")
      })
    ).toEqual([]);
  });

  it("generates exact manual recommendations from calibration", () => {
    const recommendations = generateRecommendations({
      gameId: "fortnite",
      mode: "pc",
      settings: cloneDefaults("fortnite"),
      calibration
    });

    expect(recommendations.some((item) => item.settingLabel === "Look Horizontal Speed")).toBe(true);
    expect(recommendations.some((item) => item.settingLabel === "Right Stick Dead Zone")).toBe(true);
  });

  it("increases confidence with hybrid capture and ML signals", () => {
    const base = generateRecommendations({
      gameId: "fortnite",
      mode: "pc",
      settings: cloneDefaults("fortnite"),
      calibration
    })[0];
    const hybrid = generateRecommendations({
      gameId: "fortnite",
      mode: "pc",
      settings: cloneDefaults("fortnite"),
      calibration,
      analysis
    })[0];

    expect(hybrid.confidence).toBeGreaterThan(base.confidence);
    expect(hybrid.sources).toContain("vision");
  });
});
