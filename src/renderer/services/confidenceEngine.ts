import type {
  AppMode,
  CalibrationMetrics,
  PostGameStats,
  RecommendationSeverity,
  Session
} from "../types";

export interface ConfidenceInput {
  mode: AppMode;
  sessions: Session[];
  calibrationMetrics?: CalibrationMetrics;
  postGameStats?: PostGameStats;
  hasControllerTelemetry: boolean;
  repeatedPatternCount?: number;
  metricsConflict?: boolean;
}

function clampConfidence(score: number) {
  return Math.max(5, Math.min(98, Math.round(score)));
}

export function notesMatchMetrics(notes: string, metrics?: CalibrationMetrics) {
  if (!metrics || !notes.trim()) return false;
  const normalized = notes.toLowerCase();
  return (
    (normalized.includes("over") &&
      (metrics.microAimOvershootRate > 25 || metrics.flickOvershootRate > 25)) ||
    (normalized.includes("under") &&
      (metrics.microAimUndershootRate > 25 || metrics.flickUndershootRate > 25)) ||
    (normalized.includes("drift") && metrics.rightStickDriftAverage > 0.04) ||
    (normalized.includes("track") && metrics.trackingErrorAverage > 0.18) ||
    (normalized.includes("slow") && metrics.maxStickUsagePercent > 55)
  );
}

export function hasConflictingMetrics(metrics?: CalibrationMetrics) {
  if (!metrics) return false;
  const highOvershoot =
    metrics.microAimOvershootRate > 30 || metrics.flickOvershootRate > 30;
  const highUndershoot =
    metrics.microAimUndershootRate > 30 || metrics.flickUndershootRate > 30;
  const driftHigh = metrics.rightStickDriftAverage > 0.08;
  const delayedLowDeadzoneSignal =
    metrics.rightStickDriftAverage < 0.03 && metrics.trackingErrorAverage > 0.25;
  return (highOvershoot && highUndershoot) || (driftHigh && delayedLowDeadzoneSignal);
}

export function calculateConfidence(input: ConfidenceInput) {
  const sessionCount = input.sessions.length;
  const hasFullCalibration = Boolean(input.calibrationMetrics);
  let score = 30;

  if (hasFullCalibration && sessionCount >= 3) score = 86;
  else if (hasFullCalibration) score = 76;
  else if (input.hasControllerTelemetry && sessionCount >= 3) score = 68;
  else if (input.hasControllerTelemetry) score = 52;

  if ((input.repeatedPatternCount ?? 0) >= 2) score += 5;
  if (sessionCount >= 5) score += 4;
  if (notesMatchMetrics(input.postGameStats?.notes ?? "", input.calibrationMetrics)) {
    score += 5;
  }
  if (!input.hasControllerTelemetry) score -= 12;
  if (!hasFullCalibration) score -= 10;
  if (sessionCount < 3) score -= 8;
  if (input.metricsConflict || hasConflictingMetrics(input.calibrationMetrics)) {
    score -= 15;
  }

  return clampConfidence(score);
}

export function severityFromPercent(percentChange: number): RecommendationSeverity {
  const absolute = Math.abs(percentChange);
  if (absolute >= 10) return "extreme";
  if (absolute >= 7) return "severe";
  if (absolute >= 4) return "medium";
  return "mild";
}

export function severityFromDeadzoneDelta(delta: number): RecommendationSeverity {
  const absolute = Math.abs(delta);
  if (absolute >= 0.04) return "severe";
  if (absolute >= 0.02) return "medium";
  return "mild";
}
