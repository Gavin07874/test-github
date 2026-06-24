import type {
  AnalysisSummary,
  ControllerSample,
  VisionDetection,
  VisionFrameMetric
} from "../types";
import { makeId } from "./id";

export const visionStoragePolicy = {
  storesFrames: false,
  storesScreenshots: false,
  storesClips: false,
  storesAudio: false,
  storesFullDesktop: false
} as const;

interface AnalyzeInput {
  captureSessionId: string;
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
  previousData?: Uint8ClampedArray | number[];
  controllerSample?: ControllerSample;
  detections?: Array<Omit<VisionDetection, "id" | "captureSessionId" | "timestamp">>;
  modelAvailable: boolean;
  timestamp?: number;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value.toFixed(2))));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function luminance(data: Uint8ClampedArray | number[], index: number) {
  return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
}

function diff(data: Uint8ClampedArray | number[], previous: Uint8ClampedArray | number[], index: number) {
  return (Math.abs(data[index] - previous[index]) + Math.abs(data[index + 1] - previous[index + 1]) + Math.abs(data[index + 2] - previous[index + 2])) / 3;
}

function correlation(left: number[], right: number[]) {
  if (left.length < 3 || left.length !== right.length) return 0;
  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftDenominator = 0;
  let rightDenominator = 0;
  for (let index = 0; index < left.length; index += 1) {
    const x = left[index] - leftMean;
    const y = right[index] - rightMean;
    numerator += x * y;
    leftDenominator += x * x;
    rightDenominator += y * y;
  }
  const denominator = Math.sqrt(leftDenominator * rightDenominator);
  return denominator ? numerator / denominator : 0;
}

export function targetProximity(detections: VisionDetection[]) {
  if (!detections.length) return 0;
  const centerDistances = detections
    .filter((detection) => detection.candidateTarget)
    .map((detection) => Math.hypot(detection.xCenter - 0.5, detection.yCenter - 0.5));
  if (!centerDistances.length) return 0;
  return clamp(100 - Math.min(...centerDistances) * 180);
}

export function analyzeFrameMetric(input: AnalyzeInput) {
  const step = Math.max(4, Math.floor((input.width * input.height) / 1500) * 4);
  const centerLeft = input.width * 0.34;
  const centerRight = input.width * 0.66;
  const centerTop = input.height * 0.34;
  const centerBottom = input.height * 0.66;
  let brightnessTotal = 0;
  let brightnessCount = 0;
  let fullMotion = 0;
  let fullCount = 0;
  let centerMotion = 0;
  let centerCount = 0;

  for (let index = 0; index < input.data.length; index += step) {
    const pixel = Math.floor(index / 4);
    const x = pixel % input.width;
    const y = Math.floor(pixel / input.width);
    brightnessTotal += luminance(input.data, index);
    brightnessCount += 1;
    if (input.previousData) {
      const amount = diff(input.data, input.previousData, index);
      fullMotion += amount;
      fullCount += 1;
      if (x >= centerLeft && x <= centerRight && y >= centerTop && y <= centerBottom) {
        centerMotion += amount;
        centerCount += 1;
      }
    }
  }

  const timestamp = input.timestamp ?? Date.now();
  const detections: VisionDetection[] = (input.detections ?? []).map((detection) => ({
    ...detection,
    id: makeId("vision-detection"),
    captureSessionId: input.captureSessionId,
    timestamp
  }));
  const brightness = clamp((brightnessTotal / Math.max(1, brightnessCount) / 255) * 100);
  const fullMotionScore = clamp((fullMotion / Math.max(1, fullCount) / 255) * 100);
  const centerMotionScore = clamp((centerMotion / Math.max(1, centerCount) / 255) * 100);
  const sceneChangeScore = clamp(Math.max(0, fullMotionScore - centerMotionScore * 0.25));
  const controllerStickMagnitude = clamp(
    Math.hypot(input.controllerSample?.rightX ?? 0, input.controllerSample?.rightY ?? 0) * 100
  );
  const proximity = targetProximity(detections);
  const metric: VisionFrameMetric = {
    id: makeId("vision-frame"),
    captureSessionId: input.captureSessionId,
    timestamp,
    brightness,
    sceneChangeScore,
    fullMotionScore,
    centerMotionScore,
    reticleStabilityScore: clamp(100 - centerMotionScore * 1.35 - sceneChangeScore * 0.3),
    targetProximityScore: proximity,
    targetMotionScore: clamp(centerMotionScore + proximity * 0.15),
    controllerStickMagnitude,
    adsActive: (input.controllerSample?.leftTrigger ?? 0) > 0.35,
    fireActive: (input.controllerSample?.rightTrigger ?? 0) > 0.35,
    candidateTargetCount: detections.filter((detection) => detection.candidateTarget).length,
    modelAvailable: input.modelAvailable
  };

  return { metric, detections };
}

export function summarizeAnalysis(
  captureSessionId: string,
  metrics: VisionFrameMetric[],
  detections: VisionDetection[],
  modelStatus: AnalysisSummary["modelStatus"]
): AnalysisSummary {
  const sticks = metrics.map((metric) => metric.controllerStickMagnitude);
  const motion = metrics.map((metric) => Math.max(metric.fullMotionScore, metric.centerMotionScore));
  const targetConfidence = metrics.length
    ? clamp((detections.filter((detection) => detection.candidateTarget).length / metrics.length) * 55 + average(metrics.map((metric) => metric.targetProximityScore)) * 0.45)
    : 0;
  const sampleContribution = Math.min(12, Math.floor(metrics.length / 10) * 3);
  const modelContribution = modelStatus === "ready" ? Math.min(8, Math.round(targetConfidence / 14)) : 0;

  return {
    id: makeId("analysis-summary"),
    captureSessionId,
    sampleCount: metrics.length,
    detectionCount: detections.length,
    averageStability: clamp(average(metrics.map((metric) => metric.reticleStabilityScore))),
    averageCenterMotion: clamp(average(metrics.map((metric) => metric.centerMotionScore))),
    averageTargetProximity: clamp(average(metrics.map((metric) => metric.targetProximityScore))),
    controllerScreenCorrelation: clamp(Math.max(0, correlation(sticks, motion)) * 100),
    adsInstability: clamp(average(metrics.filter((metric) => metric.adsActive).map((metric) => 100 - metric.reticleStabilityScore))),
    firingInstability: clamp(average(metrics.filter((metric) => metric.fireActive).map((metric) => 100 - metric.reticleStabilityScore))),
    targetSignalConfidence: targetConfidence,
    modelStatus,
    confidenceContribution: Math.min(20, sampleContribution + modelContribution)
  };
}
