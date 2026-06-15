import { describe, expect, it } from "vitest";
import { generateRecommendations } from "../services/precisionOptimizer";
import type {
  CalibrationMetrics,
  CurrentSettings,
  ScreenAnalysisSummary,
  Session
} from "../types";

const settings: CurrentSettings = {
  id: "settings-1",
  sessionId: "session-1",
  gameName: "Fortnite",
  platform: "pc",
  horizontalSensitivity: 40,
  verticalSensitivity: 40,
  adsSensitivity: 12,
  leftStickDeadzone: 0.1,
  rightStickDeadzone: 0.08,
  responseCurve: "Exponential"
};

const metrics: CalibrationMetrics = {
  id: "metrics-1",
  sessionId: "session-1",
  leftStickDriftAverage: 0.01,
  leftStickDriftMax: 0.02,
  rightStickDriftAverage: 0.01,
  rightStickDriftMax: 0.02,
  microAimOvershootRate: 36,
  microAimUndershootRate: 4,
  microAimSettleTime: 420,
  microAimJitter: 0.08,
  microAimAccuracy: 72,
  flickReactionTime: 220,
  flickOvershootRate: 28,
  flickUndershootRate: 8,
  flickSettleTime: 360,
  maxStickUsagePercent: 30,
  trackingErrorAverage: 0.14,
  trackingErrorMax: 0.28,
  trackingSmoothness: 78,
  trackingJitter: 0.08,
  targetLossCount: 1,
  maxStickTimePercent: 20,
  turnSpeedConsistency: 74,
  turnCorrectionCount: 2,
  adsJitter: 0.08,
  adsOvershootRate: 12,
  adsTrackingError: 0.11,
  firingStabilityScore: 80
};

const sessions: Session[] = [1, 2, 3].map((index) => ({
  id: `session-${index}`,
  mode: "pc",
  platform: "pc",
  gameName: "Fortnite",
  startedAt: new Date(index).toISOString(),
  hasControllerTelemetry: true
}));

const screenSummary: ScreenAnalysisSummary = {
  id: "screen-summary-1",
  sessionId: "session-1",
  averageBrightness: 62,
  averageSceneChangeScore: 12,
  averageFullMotionScore: 18,
  averageCenterMotionScore: 34,
  averageStabilityScore: 58,
  peakInstabilityScore: 62,
  instabilityWindowCount: 4,
  controllerScreenCorrelation: 71,
  adsInstabilityScore: 32,
  firingInstabilityScore: 35,
  confidenceContribution: 6,
  sampleCount: 18
};

describe("precisionOptimizer", () => {
  it("applies exact percentage sensitivity decreases for overshoot", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings,
      calibrationMetrics: metrics,
      sessions
    });

    const horizontal = recommendations.find(
      (item) => item.settingName === "Look Horizontal Speed"
    );

    expect(horizontal?.currentValue).toBe(40);
    expect(horizontal?.recommendedValue).toBe(38);
    expect(horizontal?.exactDelta).toBe(-2);
    expect(horizontal?.percentChange).toBe(-5);
    expect(horizontal?.severity).toBe("medium");
  });

  it("increases deadzone by the required increment when drift is moderate", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings,
      calibrationMetrics: {
        ...metrics,
        rightStickDriftAverage: 0.09,
        rightStickDriftMax: 0.14
      },
      sessions
    });

    const deadzone = recommendations.find(
      (item) => item.settingName === "Right Stick Dead Zone"
    );

    expect(deadzone?.recommendedValue).toBe(0.1);
    expect(deadzone?.exactDelta).toBe(0.02);
    expect(deadzone?.severity).toBe("medium");
  });

  it("rounds recommendations to the game profile step", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings: {
        ...settings,
        horizontalSensitivity: 41
      },
      calibrationMetrics: metrics,
      sessions
    });

    const horizontal = recommendations.find(
      (item) => item.settingName === "Look Horizontal Speed"
    );

    expect(horizontal?.recommendedValue).toBe(39);
  });

  it("clamps recommendations to profile min and max values", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings: {
        ...settings,
        rightStickDeadzone: 0.49
      },
      calibrationMetrics: {
        ...metrics,
        rightStickDriftAverage: 0.14,
        rightStickDriftMax: 0.18
      },
      sessions
    });

    const deadzone = recommendations.find(
      (item) => item.settingName === "Right Stick Dead Zone"
    );

    expect(deadzone?.recommendedValue).toBe(0.5);
  });

  it("marks large sensitivity changes as severe", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings,
      calibrationMetrics: {
        ...metrics,
        microAimOvershootRate: 52,
        flickOvershootRate: 48
      },
      sessions
    });

    const horizontal = recommendations.find(
      (item) => item.settingName === "Look Horizontal Speed"
    );

    expect(horizontal?.percentChange).toBe(-7.5);
    expect(horizontal?.severity).toBe("severe");
  });

  it("returns no recommendations before calibration metrics exist", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings,
      sessions
    });

    expect(recommendations).toEqual([]);
  });

  it("does not create recommendations from screen metrics alone", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings,
      screenAnalysisSummary: screenSummary,
      sessions
    });

    expect(recommendations).toEqual([]);
  });

  it("uses screen analysis as supporting evidence after calibration exists", () => {
    const recommendations = generateRecommendations({
      mode: "pc",
      settings: {
        ...settings,
        adsSensitivity: 50
      },
      calibrationMetrics: {
        ...metrics,
        adsJitter: 0.08,
        adsOvershootRate: 10
      },
      screenAnalysisSummary: screenSummary,
      sessions
    });

    const ads = recommendations.find(
      (item) => item.settingName === "ADS Look Sensitivity"
    );

    expect(ads?.source).toBe("screen_analysis");
    expect(ads?.supportingMetrics["Screen stability"]).toBe("58%");
    expect(ads?.supportingMetrics["Capture samples"]).toBe(18);
  });

  it("uses The Last of Us Part II setting labels in recommendations", () => {
    const tlouSettings: CurrentSettings = {
      ...settings,
      id: "tlou-settings",
      gameName: "The Last of Us Part II",
      platform: "playstation",
      horizontalSensitivity: 65,
      verticalSensitivity: 65,
      adsSensitivity: 55,
      leftStickDeadzone: 0.1,
      rightStickDeadzone: 0.08,
      responseCurve: "Default",
      aimingSensitivityY: 55,
      scopedSensitivityX: 30,
      scopedSensitivityY: 30,
      aimingAccelerationScale: 5,
      aimingRampPowerScale: 3,
      weaponSwapInvert: false
    };

    const recommendations = generateRecommendations({
      mode: "console_remote_play",
      settings: tlouSettings,
      calibrationMetrics: {
        ...metrics,
        rightStickDriftAverage: 0.09,
        rightStickDriftMax: 0.14,
        adsJitter: 0.16
      },
      sessions
    });
    const names = recommendations.map((item) => item.settingName);

    expect(names).toContain("Look Sensitivity X");
    expect(names).toContain("Look Sensitivity Y");
    expect(names).toContain("Aiming Sensitivity X");
    expect(names).toContain("Camera Stick Deadzone");
  });
});
