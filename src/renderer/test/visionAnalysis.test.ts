import { describe, expect, it } from "vitest";
import {
  analyzeFrameMetric,
  summarizeAnalysis,
  visionStoragePolicy
} from "../services/visionAnalysisEngine";

function frame(value: number) {
  const data = new Uint8ClampedArray(8 * 8 * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  return data;
}

describe("vision analysis", () => {
  it("handles synthetic frames and mocked detections", () => {
    const result = analyzeFrameMetric({
      captureSessionId: "capture-1",
      data: frame(255),
      previousData: frame(0),
      width: 8,
      height: 8,
      modelAvailable: true,
      detections: [
        {
          label: "person",
          score: 72,
          xCenter: 0.5,
          yCenter: 0.45,
          width: 0.2,
          height: 0.4,
          candidateTarget: true
        }
      ]
    });

    expect(result.metric.fullMotionScore).toBe(100);
    expect(result.metric.candidateTargetCount).toBe(1);
    expect(result.metric.targetProximityScore).toBeGreaterThan(80);
  });

  it("summarizes model fallback without crashing", () => {
    const result = analyzeFrameMetric({
      captureSessionId: "capture-2",
      data: frame(20),
      width: 8,
      height: 8,
      modelAvailable: false,
      detections: []
    });
    const summary = summarizeAnalysis("capture-2", [result.metric], [], "fallback");

    expect(summary.modelStatus).toBe("fallback");
    expect(summary.detectionCount).toBe(0);
    expect(summary.confidenceContribution).toBeGreaterThanOrEqual(0);
  });

  it("declares the no-frame storage policy", () => {
    expect(visionStoragePolicy.storesFrames).toBe(false);
    expect(visionStoragePolicy.storesScreenshots).toBe(false);
    expect(visionStoragePolicy.storesClips).toBe(false);
    expect(visionStoragePolicy.storesAudio).toBe(false);
  });
});
