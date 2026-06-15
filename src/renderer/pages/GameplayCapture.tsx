import { useEffect, useMemo, useRef, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import {
  getScreenAccessStatus,
  isCaptureBridgeAvailable,
  listCapturableWindows,
  openScreenRecordingSettings,
  selectCapturableWindow,
  startCapture,
  type CaptureController,
  type CaptureResult
} from "../services/captureService";
import type { AppMode, CapturableWindowSource, GameId, SettingsMirror, VisionFrameMetric } from "../types";

interface GameplayCaptureProps {
  gameId: GameId;
  mode: AppMode;
  settings: SettingsMirror;
  onComplete: (result: CaptureResult) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

export function GameplayCapture({
  gameId,
  mode,
  settings,
  onComplete,
  onSkip
}: GameplayCaptureProps) {
  const [sources, setSources] = useState<CapturableWindowSource[]>([]);
  const [selected, setSelected] = useState<CapturableWindowSource | undefined>();
  const [screenAccess, setScreenAccess] = useState("unknown");
  const [status, setStatus] = useState("choose window");
  const [modelStatus, setModelStatus] = useState("unavailable");
  const [elapsed, setElapsed] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [lastMetric, setLastMetric] = useState<VisionFrameMetric | undefined>();
  const [error, setError] = useState("");
  const controllerRef = useRef<CaptureController | undefined>(undefined);
  const startedAtRef = useRef<number | undefined>(undefined);
  const nativeCapture = isCaptureBridgeAvailable();
  const needsScreenPermission = nativeCapture && (
    screenAccess === "denied" ||
    screenAccess === "restricted" ||
    screenAccess === "not-determined"
  );
  const permissionError = /screen recording|permission|denied|macos/i.test(error);

  const signalQuality = useMemo(
    () => (lastMetric ? `${Math.round(lastMetric.reticleStabilityScore)}%` : "N/A"),
    [lastMetric]
  );

  async function refresh() {
    const [access, windows] = await Promise.all([getScreenAccessStatus(), listCapturableWindows()]);
    setScreenAccess(access);
    setSources(windows);
  }

  async function openPermissionSettings() {
    await openScreenRecordingSettings();
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (startedAtRef.current && (status === "running" || status === "paused")) {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [status]);

  async function chooseSource(source: CapturableWindowSource) {
    try {
      setSelected(source);
      setError("");
      await selectCapturableWindow(source);
      setStatus("ready");
    } catch (captureError) {
      setSelected(undefined);
      setStatus("error");
      setError(captureError instanceof Error ? captureError.message : "That window could not be selected.");
    }
  }

  async function start() {
    if (!selected) {
      setError("Choose a game or Remote Play window first.");
      return;
    }

    try {
      setError("");
      setSampleCount(0);
      setLastMetric(undefined);
      setElapsed(0);
      startedAtRef.current = Date.now();
      const controller = await startCapture({
        gameId,
        mode,
        settings,
        source: selected,
        onMetric(metric) {
          setLastMetric(metric);
          setSampleCount((count) => count + 1);
        },
          onStatus(nextStatus, nextModelStatus) {
          setStatus(nextStatus);
          if (nextModelStatus) setModelStatus(nextModelStatus);
        },
        onEnded(result) {
          void onComplete(result);
        }
      });
      controllerRef.current = controller;
      setStatus("running");
    } catch (captureError) {
      setStatus("error");
      setError(captureError instanceof Error ? captureError.message : "Capture could not start.");
      await refresh();
    }
  }

  async function stop() {
    const controller = controllerRef.current;
    if (!controller) return;
    const result = await controller.stop("stopped");
    await onComplete(result);
  }

  function togglePause() {
    const controller = controllerRef.current;
    if (!controller) return;
    if (status === "running") controller.pause();
    if (status === "paused") controller.resume();
  }

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 5</span>
        <h2>Gameplay capture</h2>
        <p>Choose your game or Remote Play window. AimTune stores metrics only, never frames.</p>
      </div>
      <section className="privacy-strip">
        <strong>Local ML vision</strong>
        <span>No screenshots, clips, audio, desktop capture, cloud vision, or API keys.</span>
      </section>
      {!nativeCapture ? (
        <section className="notice notice--warn">Selected-window capture works in the Electron app. Browser preview cannot access the preload bridge.</section>
      ) : null}
      {needsScreenPermission ? (
        <section className="notice notice--warn notice--stacked">
          <span>macOS Screen Recording permission is not ready. Enable Electron or AimTune AI in System Settings, Privacy & Security, Screen Recording, then fully quit and reopen AimTune.</span>
          <button className="button button--secondary button--small" onClick={() => void openPermissionSettings()}>Open Screen Recording Settings</button>
        </section>
      ) : null}
      {error ? (
        <section className="notice notice--warn notice--stacked">
          <span>{error}</span>
          {permissionError ? (
            <button className="button button--secondary button--small" onClick={() => void openPermissionSettings()}>Open Screen Recording Settings</button>
          ) : null}
        </section>
      ) : null}
      <section className="capture-grid">
        <div className="panel">
          <div className="panel-heading">
            <span>Window source</span>
            <button className="button button--secondary button--small" onClick={refresh}>Refresh</button>
          </div>
          <div className="card-list">
            {sources.length ? sources.map((source) => (
              <button className={`choice-card ${selected?.id === source.id ? "is-selected" : ""}`} disabled={status === "running" || status === "paused"} key={source.id} onClick={() => void chooseSource(source)}>
                <span>{source.name}</span>
                <strong>{selected?.id === source.id ? "Selected" : "Select window"}</strong>
              </button>
            )) : <div className="empty-state">Open Fortnite, The Last of Us Part II Remote Play, or another game window, then refresh.</div>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <span>Live analysis</span>
            <strong>{status}</strong>
          </div>
          <div className="metric-grid metric-grid--compact">
            <MetricCard label="Elapsed" value={`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`} />
            <MetricCard label="Samples" value={sampleCount} />
            <MetricCard label="Model" value={modelStatus} tone={modelStatus === "ready" ? "good" : "warn"} />
            <MetricCard label="Signal quality" value={signalQuality} />
            <MetricCard label="Candidate targets" value={lastMetric?.candidateTargetCount ?? "N/A"} />
            <MetricCard label="Center motion" value={lastMetric ? `${Math.round(lastMetric.centerMotionScore)}%` : "N/A"} />
          </div>
          <div className="footer-actions">
            <button className="button" disabled={!selected || status === "running" || status === "paused"} onClick={() => void start()}>Start Capture</button>
            <button className="button button--secondary" disabled={status !== "running" && status !== "paused"} onClick={togglePause}>
              {status === "paused" ? "Resume" : "Pause"}
            </button>
            <button className="button" disabled={status !== "running" && status !== "paused"} onClick={stop}>Stop Capture</button>
            <button className="button button--secondary" disabled={status === "running" || status === "paused"} onClick={onSkip}>Continue without capture</button>
          </div>
        </div>
      </section>
    </main>
  );
}
