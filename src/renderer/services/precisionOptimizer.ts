import type {
  AppMode,
  CalibrationMetrics,
  CurrentSettings,
  PostGameStats,
  Recommendation,
  RecommendationSource,
  Session
} from "../types";
import {
  calculateConfidence,
  hasConflictingMetrics,
  severityFromDeadzoneDelta,
  severityFromPercent
} from "./confidenceEngine";
import { clampAndRound, getGameProfile, getSettingBounds } from "./gameProfiles";

export interface OptimizerInput {
  mode: AppMode;
  settings: CurrentSettings;
  calibrationMetrics?: CalibrationMetrics;
  postGameStats?: PostGameStats;
  sessions?: Session[];
  repeatedPatternCount?: number;
}

function changeByPercent(value: number, percent: number) {
  return value * (1 + percent / 100);
}

function percentDelta(current: number, recommended: number) {
  if (current === 0) return 0;
  return Number((((recommended - current) / current) * 100).toFixed(1));
}

function exactDelta(current: number, recommended: number) {
  return Number((recommended - current).toFixed(3));
}

function includesAny(notes: string, terms: string[]) {
  const normalized = notes.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function buildNumericRecommendation(args: {
  sessionId: string;
  settingName: string;
  currentValue: number;
  recommendedValue: number;
  confidenceScore: number;
  reason: string;
  source: RecommendationSource;
  supportingMetrics: Record<string, number | string>;
  severityPercent?: number;
  severityDelta?: number;
}): Recommendation | undefined {
  const delta = exactDelta(args.currentValue, args.recommendedValue);
  if (delta === 0) return undefined;
  const percentChange = percentDelta(args.currentValue, args.recommendedValue);

  return {
    id: crypto.randomUUID(),
    sessionId: args.sessionId,
    settingName: args.settingName,
    currentValue: args.currentValue,
    recommendedValue: args.recommendedValue,
    exactDelta: delta,
    percentChange,
    confidenceScore: args.confidenceScore,
    severity:
      args.severityDelta !== undefined
        ? severityFromDeadzoneDelta(args.severityDelta)
        : severityFromPercent(args.severityPercent ?? percentChange),
    reason: args.reason,
    source: args.source,
    supportingMetrics: args.supportingMetrics
  };
}

function sensitivityPercentChange(metrics: CalibrationMetrics) {
  const overshoot = Math.max(
    metrics.microAimOvershootRate,
    metrics.flickOvershootRate
  );
  const undershoot = Math.max(
    metrics.microAimUndershootRate,
    metrics.flickUndershootRate
  );
  let change = 0;
  let cause = "No dominant sensitivity issue";

  if (overshoot > undershoot && overshoot > 45) {
    change = -8;
    cause = "Severe overshoot";
  } else if (overshoot > undershoot && overshoot > 30) {
    change = -5;
    cause = "Micro-aim overshoot";
  } else if (overshoot > undershoot && overshoot > 20) {
    change = -3;
    cause = "Light overshoot";
  } else if (undershoot > overshoot && undershoot > 45) {
    change = 8;
    cause = "Severe undershoot";
  } else if (undershoot > overshoot && undershoot > 30) {
    change = 5;
    cause = "Aim undershoot";
  }

  if (metrics.maxStickUsagePercent > 65 && undershoot > 12) {
    change = Math.max(change, 5);
    cause = "High max-stick usage with undershoot";
  }

  if (metrics.turnCorrectionCount >= 9) {
    change = change < 0 ? Math.min(change, -5) : -5;
    cause = "High turn correction count";
  } else if (metrics.turnCorrectionCount >= 5 && change <= 0) {
    change = Math.min(change, -3);
    cause = "Turn correction after fast turns";
  }

  return { change, cause, overshoot, undershoot };
}

function adsPercentChange(metrics: CalibrationMetrics, notes: string) {
  let change = 0;
  let cause = "No dominant ADS issue";

  if (metrics.adsJitter > 0.22) {
    change = -7;
    cause = "Severe ADS jitter";
  } else if (metrics.adsJitter > 0.14) {
    change = -5;
    cause = "Medium ADS jitter";
  }

  if (metrics.adsOvershootRate > 30) {
    change = Math.min(change, -5);
    cause = "ADS overshoot";
  }

  if (includesAny(notes, ["lags behind", "tracking slow", "too slow"]) && change === 0) {
    change = 3;
    cause = "Tracking lag behind target";
  }

  if (includesAny(notes, ["ahead", "overcorrect", "too fast"])) {
    change = Math.min(change, -3);
    cause = "Tracking moves ahead of target";
  }

  return { change, cause };
}

function responseCurveRecommendation(
  settings: CurrentSettings,
  metrics: CalibrationMetrics,
  confidenceScore: number
): Recommendation | undefined {
  const profile = getGameProfile(settings.gameName, settings.platform);
  const current = settings.responseCurve;
  let recommended = current;
  let reason = "";
  let supportingMetrics: Record<string, number | string> = {};

  const choose = (options: string[]) =>
    options.find((option) => profile.responseCurveOptions.includes(option));

  if (
    (metrics.microAimOvershootRate > 30 || metrics.flickOvershootRate > 30) &&
    (metrics.microAimJitter > 0.12 || metrics.adsJitter > 0.14)
  ) {
    recommended = choose(["Standard", "Smooth", "Classic", "Exponential"]) ?? current;
    reason =
      "Overshoot and jitter are both elevated, so a more controlled response curve should make small corrections easier.";
    supportingMetrics = {
      "Micro-aim overshoot rate": `${metrics.microAimOvershootRate}%`,
      "Flick overshoot rate": `${metrics.flickOvershootRate}%`,
      "ADS jitter": metrics.adsJitter
    };
  } else if (
    Math.max(metrics.microAimUndershootRate, metrics.flickUndershootRate) > 30 &&
    metrics.maxStickUsagePercent > 60
  ) {
    recommended = choose(["Linear", "Dynamic", "High Velocity"]) ?? current;
    reason =
      "Undershoot and high max-stick usage point to a response curve that is not giving enough output quickly enough.";
    supportingMetrics = {
      "Micro-aim undershoot rate": `${metrics.microAimUndershootRate}%`,
      "Flick undershoot rate": `${metrics.flickUndershootRate}%`,
      "Max stick usage": `${metrics.maxStickUsagePercent}%`
    };
  } else if (metrics.trackingSmoothness > 80 && metrics.maxStickTimePercent > 55) {
    recommended = choose(["Dynamic", "Linear", "High Velocity"]) ?? current;
    reason =
      "Tracking is smooth, but fast turns spend too much time at maximum stick input. A more responsive curve should help turns without hurting tracking.";
    supportingMetrics = {
      "Tracking smoothness": `${metrics.trackingSmoothness}%`,
      "Max stick time": `${metrics.maxStickTimePercent}%`
    };
  }

  if (recommended === current) return undefined;

  return {
    id: crypto.randomUUID(),
    sessionId: settings.sessionId ?? "pending",
    settingName: "Response Curve",
    currentValue: current,
    recommendedValue: recommended,
    exactDelta: `${current} -> ${recommended}`,
    confidenceScore,
    severity: "medium",
    reason,
    source: "calibration_lab",
    supportingMetrics
  };
}

export function generateRecommendations(input: OptimizerInput): Recommendation[] {
  const settings = input.settings;
  const metrics = input.calibrationMetrics;
  const notes = input.postGameStats?.notes ?? "";
  const profile = getGameProfile(settings.gameName, settings.platform);
  const sessionId =
    input.postGameStats?.sessionId ?? metrics?.sessionId ?? settings.sessionId ?? "pending";
  const sessions = input.sessions ?? [];
  const hasControllerTelemetry =
    sessions.some((existingSession) => existingSession.hasControllerTelemetry) ||
    Boolean(metrics);

  const confidenceScore = calculateConfidence({
    mode: input.mode,
    sessions,
    calibrationMetrics: metrics,
    postGameStats: input.postGameStats,
    hasControllerTelemetry,
    repeatedPatternCount: input.repeatedPatternCount,
    metricsConflict: hasConflictingMetrics(metrics)
  });

  const recommendations: Recommendation[] = [];

  if (!metrics) {
    return recommendations;
  }

  const rightDeadzone = getSettingBounds(profile, "deadzone");
  let deadzoneDelta = 0;
  let deadzoneCause = "";

  if (metrics.rightStickDriftAverage > 0.12) {
    deadzoneDelta = 0.04;
    deadzoneCause = "Severe right-stick drift";
  } else if (metrics.rightStickDriftAverage > 0.08) {
    deadzoneDelta = 0.02;
    deadzoneCause = "Moderate right-stick drift";
  } else if (metrics.rightStickDriftAverage > 0.05) {
    deadzoneDelta = 0.01;
    deadzoneCause = "Light right-stick drift";
  } else if (
    metrics.rightStickDriftAverage < 0.03 &&
    includesAny(notes, ["delayed", "slow", "sluggish"])
  ) {
    deadzoneDelta = -0.01;
    deadzoneCause = "Low drift with delayed feel";
  }

  if (deadzoneDelta !== 0) {
    const nextDeadzone = clampAndRound(
      settings.rightStickDeadzone + deadzoneDelta,
      rightDeadzone.min,
      rightDeadzone.max,
      rightDeadzone.step
    );
    const recommendation = buildNumericRecommendation({
      sessionId,
      settingName: "Right-stick Deadzone",
      currentValue: settings.rightStickDeadzone,
      recommendedValue: nextDeadzone,
      confidenceScore,
      reason:
        deadzoneDelta > 0
          ? "Measured right-stick drift is high enough to justify increasing deadzone while keeping the change as small as the game allows."
          : "Measured drift is low and the notes mention delayed or slow aim, so a smaller deadzone should reduce input delay.",
      source: deadzoneDelta > 0 ? "calibration_lab" : "user_notes",
      supportingMetrics: {
        "Main cause": deadzoneCause,
        "Right-stick drift average": metrics.rightStickDriftAverage,
        "Right-stick drift max": metrics.rightStickDriftMax
      },
      severityDelta: deadzoneDelta
    });
    if (recommendation) recommendations.push(recommendation);
  }

  const sensitivity = sensitivityPercentChange(metrics);
  if (sensitivity.change !== 0) {
    const horizontal = getSettingBounds(profile, "horizontalSensitivity");
    const vertical = getSettingBounds(profile, "verticalSensitivity");
    const recommendedHorizontal = clampAndRound(
      changeByPercent(settings.horizontalSensitivity, sensitivity.change),
      horizontal.min,
      horizontal.max,
      horizontal.step
    );
    const recommendedVertical = clampAndRound(
      changeByPercent(settings.verticalSensitivity, sensitivity.change * 0.75),
      vertical.min,
      vertical.max,
      vertical.step
    );

    const horizontalRecommendation = buildNumericRecommendation({
      sessionId,
      settingName: "Horizontal Sensitivity",
      currentValue: settings.horizontalSensitivity,
      recommendedValue: recommendedHorizontal,
      confidenceScore,
      reason:
        sensitivity.change < 0
          ? "Aim is consistently passing the target during stick movement. Lowering horizontal sensitivity should reduce overcorrection while preserving turn speed."
          : "Aim is stopping short of the target and using high stick output. Raising horizontal sensitivity should help reach targets with less strain.",
      source: "calibration_lab",
      supportingMetrics: {
        "Main cause": sensitivity.cause,
        "Micro-aim overshoot rate": `${metrics.microAimOvershootRate}%`,
        "Flick overshoot rate": `${metrics.flickOvershootRate}%`,
        "Micro-aim undershoot rate": `${metrics.microAimUndershootRate}%`,
        "Max stick usage": `${metrics.maxStickUsagePercent}%`,
        "Average settle time": `${metrics.microAimSettleTime}ms`
      },
      severityPercent: sensitivity.change
    });
    if (horizontalRecommendation) recommendations.push(horizontalRecommendation);

    const verticalRecommendation = buildNumericRecommendation({
      sessionId,
      settingName: "Vertical Sensitivity",
      currentValue: settings.verticalSensitivity,
      recommendedValue: recommendedVertical,
      confidenceScore,
      reason:
        sensitivity.change < 0
          ? "Vertical aim should be reduced slightly less than horizontal to calm corrections without making recoil control feel heavy."
          : "Vertical aim should increase modestly because undershoot is present and fast corrections need more output.",
      source: "calibration_lab",
      supportingMetrics: {
        "Main cause": sensitivity.cause,
        "Turn correction count": metrics.turnCorrectionCount,
        "Flick undershoot rate": `${metrics.flickUndershootRate}%`
      },
      severityPercent: sensitivity.change * 0.75
    });
    if (verticalRecommendation) recommendations.push(verticalRecommendation);
  }

  const ads = adsPercentChange(metrics, notes);
  if (ads.change !== 0) {
    const adsBounds = getSettingBounds(profile, "adsSensitivity");
    const recommendedAds = clampAndRound(
      changeByPercent(settings.adsSensitivity, ads.change),
      adsBounds.min,
      adsBounds.max,
      adsBounds.step
    );
    const adsRecommendation = buildNumericRecommendation({
      sessionId,
      settingName: "ADS Sensitivity",
      currentValue: settings.adsSensitivity,
      recommendedValue: recommendedAds,
      confidenceScore,
      reason:
        ads.change < 0
          ? "ADS movement is unstable or overshooting. Lowering ADS sensitivity should make target holding and firing stability easier."
          : "Tracking appears to lag behind the target. A small ADS increase should help the reticle keep up.",
      source: ads.change > 0 ? "user_notes" : "calibration_lab",
      supportingMetrics: {
        "Main cause": ads.cause,
        "ADS jitter": metrics.adsJitter,
        "ADS overshoot rate": `${metrics.adsOvershootRate}%`,
        "ADS tracking error": metrics.adsTrackingError,
        "Firing stability score": metrics.firingStabilityScore
      },
      severityPercent: ads.change
    });
    if (adsRecommendation) recommendations.push(adsRecommendation);
  }

  const curve = responseCurveRecommendation(settings, metrics, confidenceScore);
  if (curve) {
    curve.sessionId = sessionId;
    recommendations.push(curve);
  }

  return recommendations;
}

export const optimizerInternals = {
  changeByPercent,
  percentDelta,
  sensitivityPercentChange,
  adsPercentChange
};
