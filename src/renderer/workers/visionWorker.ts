import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import type { ControllerSample, VisionDetection } from "../types";
import { analyzeFrameMetric } from "../services/visionAnalysisEngine";

type WorkerRequest =
  | { type: "init"; wasmPath: string; modelPath: string }
  | {
      type: "frame";
      captureSessionId: string;
      imageData: ImageData;
      previousData?: Uint8ClampedArray;
      controllerSample?: ControllerSample;
      timestamp: number;
    };

let detector: ObjectDetector | undefined;
let modelStatus: "ready" | "fallback" | "unavailable" = "unavailable";

async function init(wasmPath: string, modelPath: string) {
  try {
    const vision = await FilesetResolver.forVisionTasks(wasmPath);
    detector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "CPU"
      },
      scoreThreshold: 0.28,
      runningMode: "IMAGE"
    });
    modelStatus = "ready";
  } catch (error) {
    detector = undefined;
    modelStatus = "fallback";
  }

  postMessage({ type: "ready", modelStatus });
}

function mapDetections(captureSessionId: string, timestamp: number, imageData: ImageData) {
  if (!detector) return [];
  const result = detector.detect(imageData);
  return (result.detections ?? []).map((detection) => {
    const box = detection.boundingBox;
    const category = detection.categories?.[0];
    const width = box ? box.width / imageData.width : 0;
    const height = box ? box.height / imageData.height : 0;
    const xCenter = box ? (box.originX + box.width / 2) / imageData.width : 0;
    const yCenter = box ? (box.originY + box.height / 2) / imageData.height : 0;
    const label = category?.categoryName ?? "object";
    const score = Number(((category?.score ?? 0) * 100).toFixed(1));
    const candidateTarget =
      score >= 28 &&
      width > 0.02 &&
      height > 0.04 &&
      xCenter > 0.12 &&
      xCenter < 0.88 &&
      yCenter > 0.08 &&
      yCenter < 0.92;
    return {
      captureSessionId,
      timestamp,
      label,
      score,
      xCenter,
      yCenter,
      width,
      height,
      candidateTarget
    } satisfies Omit<VisionDetection, "id">;
  });
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "init") {
    void init(request.wasmPath, request.modelPath);
    return;
  }

  try {
    const detections = mapDetections(
      request.captureSessionId,
      request.timestamp,
      request.imageData
    );
    const result = analyzeFrameMetric({
      captureSessionId: request.captureSessionId,
      data: request.imageData.data,
      previousData: request.previousData,
      width: request.imageData.width,
      height: request.imageData.height,
      controllerSample: request.controllerSample,
      detections,
      modelAvailable: modelStatus === "ready",
      timestamp: request.timestamp
    });
    postMessage({ type: "metric", modelStatus, ...result });
  } catch {
    const result = analyzeFrameMetric({
      captureSessionId: request.captureSessionId,
      data: request.imageData.data,
      previousData: request.previousData,
      width: request.imageData.width,
      height: request.imageData.height,
      controllerSample: request.controllerSample,
      detections: [],
      modelAvailable: false,
      timestamp: request.timestamp
    });
    postMessage({ type: "metric", modelStatus: "fallback", ...result });
  }
};
