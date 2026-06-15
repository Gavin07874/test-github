import { describe, expect, it } from "vitest";
import {
  analyzeFramePixels,
  screenAnalysisCapabilities,
  summarizeScreenMetrics
} from "../services/screenAnalysisEngine";
import type { GamepadSnapshot } from "../types";

const snapshot: GamepadSnapshot = {
  connected: true,
  id: "test-pad",
  index: 0,
  timestamp: 1,
  leftStickX: 0,
  leftStickY: 0,
  rightStickX: 0.5,
  rightStickY: 0,
  leftTrigger: 0.8,
  rightTrigger: 0.9,
  axes: [],
  buttons: []
};

function solidFrame(width: number, height: number, value: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  return data;
}

describe("screenAnalysisEngine", () => {
  it("computes brightness, motion, and controller state from synthetic frames", () => {
    const previousData = solidFrame(8, 8, 0);
    const data = solidFrame(8, 8, 255);

    const metric = analyzeFramePixels({
      data,
      previousData,
      width: 8,
      height: 8,
      snapshot,
      sessionId: "capture-1",
      timestamp: 100
    });

    expect(metric.brightness).toBe(100);
    expect(metric.fullMotionScore).toBe(100);
    expect(metric.centerMotionScore).toBe(100);
    expect(metric.stabilityScore).toBe(0);
    expect(metric.controllerStickMagnitude).toBe(50);
    expect(metric.adsActive).toBe(true);
    expect(metric.fireActive).toBe(true);
  });

  it("summarizes instability and never advertises raw-frame storage", () => {
    const metrics = [
      {
        ...analyzeFramePixels({
          data: solidFrame(8, 8, 30),
          width: 8,
          height: 8,
          sessionId: "capture-2"
        }),
        stabilityScore: 92,
        controllerStickMagnitude: 10
      },
      {
        ...analyzeFramePixels({
          data: solidFrame(8, 8, 255),
          previousData: solidFrame(8, 8, 0),
          width: 8,
          height: 8,
          snapshot,
          sessionId: "capture-2"
        }),
        stabilityScore: 42,
        controllerStickMagnitude: 20,
        adsActive: true,
        fireActive: true
      }
    ];

    const summary = summarizeScreenMetrics("capture-2", metrics);

    expect(summary.sampleCount).toBe(2);
    expect(summary.averageStabilityScore).toBe(67);
    expect(summary.instabilityWindowCount).toBe(1);
    expect(summary.adsInstabilityScore).toBe(58);
    expect(screenAnalysisCapabilities.storesRawFrames).toBe(false);
    expect(screenAnalysisCapabilities.storesAudio).toBe(false);
  });
});
