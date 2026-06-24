import { clampToStep, getGameProfile } from "../data/gameProfiles";
import type {
  AnalysisSummary,
  AppMode,
  CalibrationMetric,
  GameId,
  PostGameStats,
  Recommendation,
  SettingsMirror
} from "../types";
import { makeId } from "./id";

interface RecommendationInput {
  gameId: GameId;
  mode: AppMode;
  settings: SettingsMirror;
  calibration?: CalibrationMetric;
  analysis?: AnalysisSummary;
  postGameStats?: PostGameStats[];
}

function severityFromDelta(percent: number): Recommendation["severity"] {
  const value = Math.abs(percent);
  if (value >= 12) return "extreme";
  if (value >= 8) return "severe";
  if (value >= 4) return "medium";
  return "mild";
}

function baseConfidence(input: RecommendationInput) {
  if (!input.calibration) return 0;
  let confidence = 58;
  if (input.calibration.sampleCount > 150) confidence += 12;
  if (input.mode === "pc" || input.mode === "console_remote_play") confidence += 8;
  confidence += input.analysis?.confidenceContribution ?? 0;
  if ((input.postGameStats?.length ?? 0) > 0) confidence += 4;
  if (input.analysis?.modelStatus === "ready") confidence += 4;
  if (input.analysis?.modelStatus === "fallback") confidence -= 5;
  return Math.max(5, Math.min(96, Math.round(confidence)));
}

function numericRecommendation(args: {
  gameId: GameId;
  settings: SettingsMirror;
  settingKey: keyof SettingsMirror;
  settingLabel: string;
  current: number;
  recommended: number;
  confidence: number;
  reason: string;
  supportingMetrics: Record<string, number | string>;
  sources: Recommendation["sources"];
}): Recommendation | undefined {
  const delta = Number((args.recommended - args.current).toFixed(3));
  if (delta === 0) return undefined;
  const percent = args.current === 0 ? delta : Number(((delta / args.current) * 100).toFixed(1));
  return {
    id: makeId("recommendation"),
    gameId: args.gameId,
    settingKey: args.settingKey,
    settingLabel: args.settingLabel,
    currentValue: args.current,
    recommendedValue: args.recommended,
    exactDelta: delta,
    severity: severityFromDelta(percent),
    confidence: args.confidence,
    reason: args.reason,
    supportingMetrics: args.supportingMetrics,
    sources: args.sources
  };
}

export function generateRecommendations(input: RecommendationInput) {
  if (!input.calibration) return [];
  const profile = getGameProfile(input.gameId);
  const confidence = baseConfidence(input);
  const recommendations: Recommendation[] = [];
  const labels = new Map(profile.settings.map((setting) => [setting.key, setting]));
  const sources: Recommendation["sources"] = ["calibration", "controller"];
  if (input.analysis) sources.push("capture");
  if (input.analysis?.modelStatus === "ready") sources.push("vision");
  if ((input.postGameStats?.length ?? 0) > 0) sources.push("post_game");

  let lookChange = 0;
  if (input.calibration.microOvershootRate > 30 || input.calibration.flickOvershootRate > 30) lookChange -= 5;
  if (input.calibration.microOvershootRate > 48 || input.calibration.flickOvershootRate > 48) lookChange -= 3;
  if (input.calibration.microUndershootRate > 35 || input.calibration.flickUndershootRate > 35) lookChange += 5;
  if (input.calibration.maxTurnInputPercent > 55 && input.calibration.turnConsistency < 72) lookChange += 3;
  if ((input.analysis?.targetSignalConfidence ?? 0) > 55 && (input.analysis?.averageTargetProximity ?? 0) < 28) lookChange += 2;
  if ((input.analysis?.averageCenterMotion ?? 0) > 24 && lookChange > 0) lookChange = Math.max(0, lookChange - 2);

  const lookX = labels.get("lookX");
  const lookY = labels.get("lookY");
  if (lookChange !== 0 && lookX && lookY) {
    recommendations.push(
      ...[
        numericRecommendation({
          gameId: input.gameId,
          settings: input.settings,
          settingKey: "lookX",
          settingLabel: lookX.label,
          current: input.settings.lookX,
          recommended: clampToStep(input.settings.lookX * (1 + lookChange / 100), lookX.min, lookX.max, lookX.step),
          confidence,
          reason: lookChange < 0 ? "Calibration shows overcorrection, so lower horizontal look speed slightly." : "Calibration shows undershoot or heavy max-stick use, so raise horizontal look speed slightly.",
          supportingMetrics: {
            "Micro overshoot": `${input.calibration.microOvershootRate}%`,
            "Flick overshoot": `${input.calibration.flickOvershootRate}%`,
            "Target signal": `${input.analysis?.targetSignalConfidence ?? 0}%`
          },
          sources
        }),
        numericRecommendation({
          gameId: input.gameId,
          settings: input.settings,
          settingKey: "lookY",
          settingLabel: lookY.label,
          current: input.settings.lookY,
          recommended: clampToStep(input.settings.lookY * (1 + (lookChange * 0.75) / 100), lookY.min, lookY.max, lookY.step),
          confidence,
          reason: "Vertical look changes are smaller than horizontal to protect recoil and camera control.",
          supportingMetrics: {
            "Turn consistency": `${input.calibration.turnConsistency}%`,
            "Max turn input": `${input.calibration.maxTurnInputPercent}%`
          },
          sources
        })
      ].filter((item): item is Recommendation => Boolean(item))
    );
  }

  const deadzone = labels.get("rightDeadzone");
  if (deadzone) {
    let delta = 0;
    if (input.calibration.driftAverage > 0.1) delta = 0.04;
    else if (input.calibration.driftAverage > 0.07) delta = 0.02;
    else if (input.calibration.driftAverage > 0.045) delta = 0.01;
    const rec = numericRecommendation({
      gameId: input.gameId,
      settings: input.settings,
      settingKey: "rightDeadzone",
      settingLabel: deadzone.label,
      current: input.settings.rightDeadzone,
      recommended: clampToStep(input.settings.rightDeadzone + delta, deadzone.min, deadzone.max, deadzone.step),
      confidence,
      reason: "Measured resting camera-stick drift is high enough to justify the smallest useful deadzone increase.",
      supportingMetrics: {
        "Drift average": input.calibration.driftAverage,
        "Drift max": input.calibration.driftMax
      },
      sources
    });
    if (delta && rec) recommendations.push(rec);
  }

  const aimKey: keyof SettingsMirror = input.gameId === "tlou2" ? "aimX" : "aimX";
  const aim = labels.get(aimKey);
  if (aim) {
    let aimChange = 0;
    if (input.calibration.adsJitter > 0.12 || input.calibration.firingStability < 72) aimChange -= 5;
    if ((input.analysis?.adsInstability ?? 0) > 25 || (input.analysis?.firingInstability ?? 0) > 25) aimChange -= 3;
    const rec = numericRecommendation({
      gameId: input.gameId,
      settings: input.settings,
      settingKey: aimKey,
      settingLabel: aim.label,
      current: Number(input.settings[aimKey]),
      recommended: clampToStep(Number(input.settings[aimKey]) * (1 + aimChange / 100), aim.min, aim.max, aim.step),
      confidence,
      reason: "ADS/firing stability signals point to lowering aim sensitivity for steadier target holding.",
      supportingMetrics: {
        "ADS jitter": input.calibration.adsJitter,
        "Firing stability": `${input.calibration.firingStability}%`,
        "Capture ADS instability": `${input.analysis?.adsInstability ?? 0}%`
      },
      sources
    });
    if (aimChange && rec) recommendations.push(rec);
  }

  return recommendations.slice(0, 6);
}

export const recommendationInternals = {
  baseConfidence,
  severityFromDelta
};
