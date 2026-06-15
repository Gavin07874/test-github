import { useEffect, useMemo, useRef, useState } from "react";
import { MetricBadge } from "../components/MetricBadge";
import {
  getScreenAccessStatus,
  isNativeCaptureAvailable,
  listCapturableWindowSources,
  startScreenCapture,
  type ScreenCaptureController,
  type ScreenCaptureResult
} from "../services/screenCaptureService";
import type {
  AppMode,
  CapturableWindowSource,
  CurrentSettings,
  ScreenCaptureSessionStatus,
  ScreenFrameMetric
} from "../types";

type CaptureUiStatus =
  | "source_required"
  | "running"
  | "paused"
  | "stopped"
  | "partial"
  | "saving"
  | "error";

interface GameplayCaptureProps {
  mode?: AppMode;
  settings?: CurrentSettings;
  onComplete: (result: ScreenCaptureResult) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

function sourceStatusCopy(status: CaptureUiStatus) {
  if (status === "running") return "Running";
  if (status === "paused") return "Paused";
  if (status === "saving") return "Saving summary";
  if (status === "partial") return "Window closed";
  if (status === "error") return "Needs attention";
  if (status === "stopped") return "Stopped";
  return "Choose a window";
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function GameplayCapture({
  mode,
  settings,
  onComplete,
  onSkip
}: GameplayCaptureProps) {
  const [sources, setSources] = useState<CapturableWindowSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<CapturableWindowSource | undefined>();
  const [status, setStatus] = useState<CaptureUiStatus>("source_required");
  const [screenAccessStatus, setScreenAccessStatus] = useState("unknown");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [lastMetric, setLastMetric] = useState<ScreenFrameMetric | undefined>();
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const controllerRef = useRef<ScreenCaptureController | undefined>(undefined);
  const savingRef = useRef(false);
  const startedAtRef = useRef<number | undefined>(undefined);

  const nativeCaptureAvailable = isNativeCaptureAvailable();
  const canStart =
    nativeCaptureAvailable &&
    Boolean(settings && mode) &&
    screenAccessStatus !== "denied" &&
    screenAccessStatus !== "restricted" &&
    status !== "running" &&
    status !== "paused" &&
    status !== "saving";

  const signalQuality = useMemo(() => {
    if (!lastMetric) return "N/A";
    return `${Math.round(lastMetric.stabilityScore)}%`;
  }, [lastMetric]);

  useEffect(() => {
    let active = true;

    async function loadSources() {
      setRefreshing(true);
      const [access, windowSources] = await Promise.all([
        getScreenAccessStatus(),
        listCapturableWindowSources()
      ]);
      if (!active) return;
      setScreenAccessStatus(access);
      setSources(windowSources);
      setRefreshing(false);
    }

    void loadSources();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!startedAtRef.current || (status !== "running" && status !== "paused")) {
        return;
      }
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)));
    }, 500);

    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    return () => {
      const controller = controllerRef.current;
      if (controller && controller.session.status !== "stopped") {
        void controller.stop("partial");
      }
    };
  }, []);

  async function refreshSources() {
    setRefreshing(true);
    setError("");
    const [access, windowSources] = await Promise.all([
      getScreenAccessStatus(),
      listCapturableWindowSources()
    ]);
    setScreenAccessStatus(access);
    setSources(windowSources);
    setRefreshing(false);
  }

  async function persistResult(result: ScreenCaptureResult) {
    if (savingRef.current) return;
    savingRef.current = true;
    setStatus("saving");
    await onComplete(result);
  }

  async function startSelectedCapture(source: CapturableWindowSource) {
    if (!settings || !mode || !canStart) return;

    setSelectedSource(source);
    setStatus("running");
    setError("");
    setSampleCount(0);
    setLastMetric(undefined);
    setElapsedSeconds(0);
    startedAtRef.current = Date.now();

    try {
      const controller = await startScreenCapture({
        source,
        mode,
        settings,
        onMetric(metric) {
          setSampleCount((count) => count + 1);
          setLastMetric(metric);
        },
        onStatus(nextStatus: ScreenCaptureSessionStatus) {
          setStatus(nextStatus === "error" ? "error" : nextStatus);
        },
        onEnded(result) {
          void persistResult(result);
        }
      });
      controllerRef.current = controller;
    } catch (captureError) {
      startedAtRef.current = undefined;
      setStatus("error");
      setError(
        captureError instanceof Error
          ? captureError.message
          : "AimTune could not start capture for that window."
      );
    }
  }

  async function stopCapture() {
    const controller = controllerRef.current;
    if (!controller) return;
    const result = await controller.stop("stopped");
    await persistResult(result);
  }

  function pauseOrResume() {
    const controller = controllerRef.current;
    if (!controller) return;
    if (status === "running") controller.pause();
    if (status === "paused") controller.resume();
  }

  return (
    <main className="page page--capture">
      <div className="page-heading">
        <span className="eyebrow">Step 6</span>
        <h2>Gameplay capture</h2>
        <p>
          Choose your Fortnite, The Last of Us Part II, or Remote Play window.
          AimTune stores metrics only, not frames.
        </p>
      </div>

      <section className="capture-privacy-panel">
        <div>
          <strong>Local window analysis</strong>
          <span>No screenshots, clips, audio, desktop capture, cloud vision, or API keys.</span>
        </div>
        <div className="metric-row">
          <MetricBadge label="Screen access" value={screenAccessStatus} />
          <MetricBadge label="Capture" value={sourceStatusCopy(status)} />
          <MetricBadge label="Game" value={settings?.gameName ?? "Not selected"} />
        </div>
      </section>

      {!nativeCaptureAvailable ? (
        <section className="notice-panel notice-panel--warn">
          Window capture is available in the packaged AimTune desktop app. The
          browser preview can show this page, but it cannot access Electron's
          selected-window capture bridge.
        </section>
      ) : null}

      {screenAccessStatus === "denied" || screenAccessStatus === "restricted" ? (
        <section className="notice-panel notice-panel--warn">
          macOS Screen Recording permission is not available. Open System
          Settings, Privacy & Security, Screen Recording, enable AimTune AI, then
          reopen the app.
        </section>
      ) : null}

      {error ? <section className="notice-panel notice-panel--warn">{error}</section> : null}

      <div className="capture-layout">
        <section className="panel">
          <div className="panel__heading">
            <span>Window source</span>
            <button
              className="button button--secondary button--small"
              disabled={refreshing || status === "running" || status === "paused"}
              onClick={refreshSources}
            >
              Refresh
            </button>
          </div>

          <div className="capture-source-list">
            {sources.length ? (
              sources.map((source) => (
                <button
                  className={`capture-source-card ${
                    selectedSource?.id === source.id ? "is-selected" : ""
                  }`}
                  disabled={!canStart}
                  key={source.id}
                  onClick={() => startSelectedCapture(source)}
                >
                  <span>{source.name}</span>
                  <strong>{selectedSource?.id === source.id ? "Selected" : "Start capture"}</strong>
                </button>
              ))
            ) : (
              <div className="empty-state">
                {refreshing
                  ? "Looking for windows..."
                  : "Open your game or Remote Play window, then refresh."}
              </div>
            )}
          </div>
        </section>

        <section className="capture-status-panel">
          <div className="panel__heading">
            <span>Capture status</span>
            <strong>{sourceStatusCopy(status)}</strong>
          </div>

          <div className="capture-meter-grid">
            <MetricBadge label="Selected window" value={selectedSource?.name ?? "None"} />
            <MetricBadge label="Elapsed" value={formatSeconds(elapsedSeconds)} />
            <MetricBadge label="Samples" value={sampleCount} />
            <MetricBadge label="Last signal quality" value={signalQuality} />
            <MetricBadge
              label="Center motion"
              value={lastMetric ? `${Math.round(lastMetric.centerMotionScore)}%` : "N/A"}
            />
            <MetricBadge
              label="Stick output"
              value={lastMetric ? `${Math.round(lastMetric.controllerStickMagnitude)}%` : "N/A"}
            />
          </div>

          <div className="capture-state-strip">
            <span className={status === "running" ? "is-live" : ""} />
            <div>
              <strong>{selectedSource?.name ?? "No window selected"}</strong>
              <small>
                Keep AimTune open or minimized. If the selected window closes,
                AimTune saves a partial metrics summary and moves on.
              </small>
            </div>
          </div>

          <div className="footer-actions">
            <button
              className="button button--secondary"
              disabled={status !== "running" && status !== "paused"}
              onClick={pauseOrResume}
            >
              {status === "paused" ? "Resume capture" : "Pause capture"}
            </button>
            <button
              className="button"
              disabled={status !== "running" && status !== "paused"}
              onClick={stopCapture}
            >
              Stop Capture
            </button>
            <button
              className="button button--secondary"
              disabled={status === "running" || status === "paused" || status === "saving"}
              onClick={onSkip}
            >
              Continue without capture
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
