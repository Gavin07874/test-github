import type {
  AppMode,
  CapturableWindowSource,
  CurrentSettings,
  ScreenAnalysisSummary,
  ScreenCaptureSession,
  ScreenCaptureSessionStatus,
  ScreenFrameMetric
} from "../types";
import { readPrimaryGamepadSnapshot } from "./gamepadService";
import { analyzeFramePixels, summarizeScreenMetrics } from "./screenAnalysisEngine";

export interface ScreenCaptureResult {
  session: ScreenCaptureSession;
  metrics: ScreenFrameMetric[];
  summary: ScreenAnalysisSummary;
}

export interface ScreenCaptureController {
  session: ScreenCaptureSession;
  metrics: ScreenFrameMetric[];
  pause: () => void;
  resume: () => void;
  stop: (status?: ScreenCaptureSessionStatus) => Promise<ScreenCaptureResult>;
}

interface StartScreenCaptureInput {
  source: CapturableWindowSource;
  mode: AppMode;
  settings: CurrentSettings;
  onMetric?: (metric: ScreenFrameMetric) => void;
  onStatus?: (status: ScreenCaptureSessionStatus) => void;
  onEnded?: (result: ScreenCaptureResult) => void | Promise<void>;
}

const sampleIntervalMs = 500;
const analysisWidth = 96;
const analysisHeight = 54;

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function captureBridge() {
  return window.aimTune?.capture;
}

export async function listCapturableWindowSources() {
  const bridge = captureBridge();
  if (!bridge) return [];
  return bridge.listWindowSources();
}

export async function getScreenAccessStatus() {
  const bridge = captureBridge();
  if (!bridge) return "unknown";
  return bridge.screenAccessStatus();
}

export function isNativeCaptureAvailable() {
  return Boolean(captureBridge() && navigator.mediaDevices?.getDisplayMedia);
}

export async function startScreenCapture({
  source,
  mode,
  settings,
  onMetric,
  onStatus,
  onEnded
}: StartScreenCaptureInput): Promise<ScreenCaptureController> {
  const bridge = captureBridge();
  if (!bridge || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Window capture is available in the AimTune desktop app.");
  }

  const sourceSelected = await bridge.selectSource(source.id);
  if (!sourceSelected) {
    throw new Error("That window is no longer available. Pick the game window again.");
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 5, max: 5 },
      width: { ideal: 960 },
      height: { ideal: 540 }
    },
    audio: false
  });

  const sessionId = createId("screen-capture");
  const startedAtMs = Date.now();
  const session: ScreenCaptureSession = {
    id: sessionId,
    gameName: settings.gameName,
    mode,
    sourceName: source.name,
    startedAt: new Date(startedAtMs).toISOString(),
    status: "running"
  };
  const metrics: ScreenFrameMetric[] = [];
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let previousData: Uint8ClampedArray | undefined;
  let intervalId: number | undefined;
  let stopped = false;
  let paused = false;
  let stopPromise: Promise<ScreenCaptureResult> | undefined;

  canvas.width = analysisWidth;
  canvas.height = analysisHeight;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();

  function updateStatus(status: ScreenCaptureSessionStatus) {
    session.status = status;
    onStatus?.(status);
  }

  function sampleFrame() {
    if (stopped || paused || !context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    context.drawImage(video, 0, 0, analysisWidth, analysisHeight);
    const imageData = context.getImageData(0, 0, analysisWidth, analysisHeight);
    const metric = analyzeFramePixels({
      data: imageData.data,
      previousData,
      width: analysisWidth,
      height: analysisHeight,
      snapshot: readPrimaryGamepadSnapshot(),
      timestamp: Date.now(),
      sessionId
    });

    previousData = new Uint8ClampedArray(imageData.data);
    metrics.push(metric);
    onMetric?.(metric);
  }

  async function stop(status: ScreenCaptureSessionStatus = "stopped") {
    if (stopPromise) return stopPromise;

    stopPromise = Promise.resolve().then(() => {
      stopped = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      updateStatus(status);

      const endedAtMs = Date.now();
      session.endedAt = new Date(endedAtMs).toISOString();
      session.durationSeconds = Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
      const summary = summarizeScreenMetrics(sessionId, metrics);
      return { session, metrics, summary };
    });

    return stopPromise;
  }

  stream.getVideoTracks().forEach((track) => {
    track.addEventListener(
      "ended",
      () => {
        if (!stopped) {
          void stop("partial").then((result) => onEnded?.(result));
        }
      },
      { once: true }
    );
  });

  intervalId = window.setInterval(sampleFrame, sampleIntervalMs);
  sampleFrame();
  updateStatus("running");

  return {
    session,
    metrics,
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
