import type {
  AnalysisSummary,
  AppMode,
  CapturableWindowSource,
  CaptureSession,
  ControllerSample,
  GameId,
  SettingsMirror,
  VisionDetection,
  VisionFrameMetric
} from "../types";
import { readGamepadSnapshot, toControllerSample } from "./gamepadService";
import { makeId } from "./id";
import { summarizeAnalysis } from "./visionAnalysisEngine";

export interface CaptureResult {
  session: CaptureSession;
  metrics: VisionFrameMetric[];
  detections: VisionDetection[];
  summary: AnalysisSummary;
}

export interface CaptureController {
  session: CaptureSession;
  metrics: VisionFrameMetric[];
  detections: VisionDetection[];
  pause: () => void;
  resume: () => void;
  stop: (status?: CaptureSession["status"]) => Promise<CaptureResult>;
}

interface StartCaptureInput {
  gameId: GameId;
  mode: AppMode;
  settings: SettingsMirror;
  source: CapturableWindowSource;
  onMetric?: (metric: VisionFrameMetric, detections: VisionDetection[]) => void;
  onStatus?: (status: CaptureSession["status"], modelStatus?: CaptureSession["modelStatus"]) => void;
  onEnded?: (result: CaptureResult) => void | Promise<void>;
}

const width = 256;
const height = 144;
const intervalMs = 150;
function assetUrl(path: string) {
  return new URL(path, window.location.href).toString();
}

function bridge() {
  return window.aimTune?.capture;
}

export function isCaptureBridgeAvailable() {
  return Boolean(bridge() && navigator.mediaDevices?.getDisplayMedia);
}

export async function listCapturableWindows() {
  return bridge()?.listWindowSources() ?? [];
}

export async function getScreenAccessStatus() {
  return bridge()?.screenAccessStatus() ?? "unknown";
}

function makeWorker() {
  return new Worker(new URL("../workers/visionWorker.ts", import.meta.url), {
    type: "module"
  });
}

export async function startCapture(input: StartCaptureInput): Promise<CaptureController> {
  const captureBridge = bridge();
  if (!captureBridge || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Selected-window capture is available in the AimTune desktop app.");
  }
  const selected = await captureBridge.selectSource(input.source.id);
  if (!selected) throw new Error("That window is no longer available.");

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 8, max: 10 },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });

  const sessionId = makeId("capture-session");
  const startedAtMs = Date.now();
  const session: CaptureSession = {
    id: sessionId,
    gameId: input.gameId,
    mode: input.mode,
    sourceName: input.source.name,
    startedAt: new Date(startedAtMs).toISOString(),
    status: "running",
    modelStatus: "unavailable"
  };

  const metrics: VisionFrameMetric[] = [];
  const detections: VisionDetection[] = [];
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const worker = makeWorker();
  let previousData: Uint8ClampedArray | undefined;
  let timer: number | undefined;
  let stopped = false;
  let paused = false;
  let inFlight = false;
  let stopPromise: Promise<CaptureResult> | undefined;

  canvas.width = width;
  canvas.height = height;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();

  worker.onmessage = (event: MessageEvent) => {
    const message = event.data;
    if (message.type === "ready") {
      session.modelStatus = message.modelStatus;
      input.onStatus?.(session.status, session.modelStatus);
      return;
    }
    if (message.type === "metric") {
      inFlight = false;
      session.modelStatus = message.modelStatus;
      metrics.push(message.metric);
      detections.push(...message.detections);
      input.onMetric?.(message.metric, message.detections);
    }
  };
  worker.postMessage({
    type: "init",
    wasmPath: assetUrl("mediapipe/wasm"),
    modelPath: assetUrl("models/efficientdet_lite0_uint8.tflite")
  });

  function updateStatus(status: CaptureSession["status"]) {
    session.status = status;
    input.onStatus?.(status, session.modelStatus);
  }

  function sample() {
    if (stopped || paused || inFlight || !context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }
    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const sample: ControllerSample = toControllerSample(sessionId, readGamepadSnapshot());
    inFlight = true;
    worker.postMessage({
      type: "frame",
      captureSessionId: sessionId,
      imageData,
      previousData,
      controllerSample: sample,
      timestamp: Date.now()
    });
    previousData = new Uint8ClampedArray(imageData.data);
  }

  async function stop(status: CaptureSession["status"] = "stopped") {
    if (stopPromise) return stopPromise;
    stopPromise = Promise.resolve().then(() => {
      stopped = true;
      if (timer !== undefined) window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      worker.terminate();
      video.srcObject = null;
      updateStatus(status);
      const endedAtMs = Date.now();
      session.endedAt = new Date(endedAtMs).toISOString();
      session.durationSeconds = Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
      const summary = summarizeAnalysis(sessionId, metrics, detections, session.modelStatus);
      return { session, metrics, detections, summary };
    });
    return stopPromise;
  }

  stream.getVideoTracks().forEach((track) => {
    track.addEventListener(
      "ended",
      () => {
        if (!stopped) void stop("partial").then((result) => input.onEnded?.(result));
      },
      { once: true }
    );
  });

  timer = window.setInterval(sample, intervalMs);
  sample();
  updateStatus("running");

  return {
    session,
    metrics,
    detections,
    pause() {
      if (stopped || paused) return;
      paused = true;
      updateStatus("paused");
    },
    resume() {
      if (stopped || !paused) return;
      paused = false;
      updateStatus("running");
    },
    stop
  };
}
