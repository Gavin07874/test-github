import type {
  GamepadSnapshot,
  ScreenAnalysisSummary,
  ScreenFrameMetric
} from "../types";

interface FrameAnalysisInput {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
  previousData?: Uint8ClampedArray | number[];
  snapshot?: GamepadSnapshot;
  timestamp?: number;
  sessionId?: string;
  id?: string;
}

export const screenAnalysisCapabilities = {
  storesRawFrames: false,
  storesScreenshots: false,
  storesAudio: false,
  futureLocalHooks: ["ocr", "object_detection"]
} as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function luminance(data: Uint8ClampedArray | number[], index: number) {
  return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
}

function pixelDifference(
  data: Uint8ClampedArray | number[],
  previousData: Uint8ClampedArray | number[],
  index: number
) {
  const red = Math.abs(data[index] - previousData[index]);
  const green = Math.abs(data[index + 1] - previousData[index + 1]);
  const blue = Math.abs(data[index + 2] - previousData[index + 2]);
  return (red + green + blue) / 3;
}

function pearsonCorrelation(x: number[], y: number[]) {
  if (x.length < 3 || y.length < 3 || x.length !== y.length) return 0;
  const meanX = average(x);
  const meanY = average(y);
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let index = 0; index < x.length; index += 1) {
    const dx = x[index] - meanX;
    const dy = y[index] - meanY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }

  const denominator = Math.sqrt(denominatorX * denominatorY);
  if (!denominator) return 0;
  return numerator / denominator;
}

export function analyzeFramePixels(input: FrameAnalysisInput): ScreenFrameMetric {
  const { data, previousData, width, height } = input;
  const pixelCount = Math.max(1, width * height);
  const centerLeft = Math.floor(width * 0.34);
  const centerRight = Math.ceil(width * 0.66);
  const centerTop = Math.floor(height * 0.34);
  const centerBottom = Math.ceil(height * 0.66);
  const step = Math.max(4, Math.floor(pixelCount / 1800) * 4);

  let brightnessTotal = 0;
  let brightnessSamples = 0;
  let fullDiffTotal = 0;
  let fullDiffSamples = 0;
  let centerDiffTotal = 0;
  let centerDiffSamples = 0;

  for (let index = 0; index < data.length; index += step) {
    const pixelIndex = Math.floor(index / 4);
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    brightnessTotal += luminance(data, index);
    brightnessSamples += 1;

    if (previousData) {
      const diff = pixelDifference(data, previousData, index);
      fullDiffTotal += diff;
      fullDiffSamples += 1;

      if (
        x >= centerLeft &&
        x <= centerRight &&
        y >= centerTop &&
        y <= centerBottom
      ) {
        centerDiffTotal += diff;
        centerDiffSamples += 1;
      }
    }
  }

  const brightness = clampScore((brightnessTotal / Math.max(1, brightnessSamples) / 255) * 100);
  const fullMotionScore = clampScore(
    (fullDiffTotal / Math.max(1, fullDiffSamples) / 255) * 100
  );
  const centerMotionScore = clampScore(
    (centerDiffTotal / Math.max(1, centerDiffSamples) / 255) * 100
  );
  const sceneChangeScore = clampScore(Math.max(0, fullMotionScore - centerMotionScore * 0.25));
  const stabilityScore = clampScore(
    100 - centerMotionScore * 1.4 - sceneChangeScore * 0.35
  );
  const rightStickX = input.snapshot?.rightStickX ?? 0;
  const rightStickY = input.snapshot?.rightStickY ?? 0;
  const controllerStickMagnitude = clampScore(
    Math.hypot(rightStickX, rightStickY) * 100
  );
  const leftTriggerButton = input.snapshot?.buttons.find((button) => button.index === 6);
  const rightTriggerButton = input.snapshot?.buttons.find((button) => button.index === 7);
  const adsActive =
    (input.snapshot?.leftTrigger ?? 0) > 0.35 ||
    Boolean(leftTriggerButton?.pressed || (leftTriggerButton?.value ?? 0) > 0.35);
  const fireActive =
    (input.snapshot?.rightTrigger ?? 0) > 0.35 ||
    Boolean(rightTriggerButton?.pressed || (rightTriggerButton?.value ?? 0) > 0.35);

  return {
    id: input.id ?? createId("frame"),
    sessionId: input.sessionId ?? "pending",
    timestamp: input.timestamp ?? Date.now(),
    brightness,
    sceneChangeScore,
    fullMotionScore,
    centerMotionScore,
    stabilityScore,
    controllerStickMagnitude,
    adsActive,
    fireActive
  };
}

export function summarizeScreenMetrics(
  sessionId: string,
  metrics: ScreenFrameMetric[]
): ScreenAnalysisSummary {
  const instabilityScores = metrics.map((metric) => 100 - metric.stabilityScore);
  const lowInputInstability = metrics.filter(
    (metric) => metric.stabilityScore < 70 && metric.controllerStickMagnitude < 35
  );
  const adsMetrics = metrics.filter((metric) => metric.adsActive);
  const firingMetrics = metrics.filter((metric) => metric.fireActive);
  const correlation = pearsonCorrelation(
    metrics.map((metric) => metric.controllerStickMagnitude),
    metrics.map((metric) => Math.max(metric.fullMotionScore, metric.centerMotionScore))
  );
  const sampleScore = Math.min(8, Math.floor(metrics.length / 12) * 2);
  const stabilityBonus =
    metrics.length >= 12 && average(metrics.map((metric) => metric.stabilityScore)) > 65
      ? 2
      : 0;

  return {
    id: createId("screen-summary"),
    sessionId,
    averageBrightness: clampScore(average(metrics.map((metric) => metric.brightness))),
    averageSceneChangeScore: clampScore(
      average(metrics.map((metric) => metric.sceneChangeScore))
    ),
    averageFullMotionScore: clampScore(
      average(metrics.map((metric) => metric.fullMotionScore))
    ),
    averageCenterMotionScore: clampScore(
      average(metrics.map((metric) => metric.centerMotionScore))
    ),
    averageStabilityScore: clampScore(
      average(metrics.map((metric) => metric.stabilityScore))
    ),
    peakInstabilityScore: clampScore(Math.max(0, ...instabilityScores)),
    instabilityWindowCount: lowInputInstability.length,
    controllerScreenCorrelation: clampScore(Math.max(0, correlation) * 100),
    adsInstabilityScore: clampScore(
      average(adsMetrics.map((metric) => 100 - metric.stabilityScore))
    ),
    firingInstabilityScore: clampScore(
      average(firingMetrics.map((metric) => 100 - metric.stabilityScore))
    ),
    confidenceContribution: Math.min(10, sampleScore + stabilityBonus),
    sampleCount: metrics.length
  };
}
