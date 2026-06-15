import { useEffect, useRef, useState } from "react";
import { MetricBadge } from "../components/MetricBadge";
import {
  emptyGamepadSnapshot,
  startGamepadLoop
} from "../services/gamepadService";
import { SessionRecorder } from "../services/sessionRecorder";
import type {
  AppMode,
  CurrentSettings,
  InputSample,
  Session,
  SessionRecorderStatus
} from "../types";

interface NewSessionProps {
  mode?: AppMode;
  settings?: CurrentSettings;
  session?: Session;
  onSessionSaved: (session: Session, samples: InputSample[]) => void;
  onContinue: () => void;
}

export function NewSession({
  mode,
  settings,
  session,
  onSessionSaved,
  onContinue
}: NewSessionProps) {
  const recorderRef = useRef<SessionRecorder | null>(null);
  const [status, setStatus] = useState<SessionRecorderStatus>("idle");
  const [sampleCount, setSampleCount] = useState(0);
  const [activeSession, setActiveSession] = useState<Session | undefined>(session);
  const [snapshot, setSnapshot] = useState(emptyGamepadSnapshot);
  const samplePulseRef = useRef<number | undefined>(undefined);

  if (!recorderRef.current) {
    recorderRef.current = new SessionRecorder();
  }

  useEffect(() => {
    const stopLoop = startGamepadLoop(setSnapshot);
    return () => {
      stopLoop();
      if (samplePulseRef.current) window.clearInterval(samplePulseRef.current);
    };
  }, []);

  async function start() {
    if (!mode || !settings || !recorderRef.current) return;
    const created = await recorderRef.current.start({
      mode,
      platform: settings.platform,
      gameName: settings.gameName
    });
    setActiveSession(created);
    setStatus(recorderRef.current.status);
    onSessionSaved(created, recorderRef.current.getSamples());
    samplePulseRef.current = window.setInterval(() => {
      setSampleCount(recorderRef.current?.getSamples().length ?? 0);
    }, 300);
  }

  function pause() {
    recorderRef.current?.pause();
    setStatus(recorderRef.current?.status ?? "idle");
  }

  function resume() {
    recorderRef.current?.resume();
    setStatus(recorderRef.current?.status ?? "idle");
  }

  async function stop() {
    if (samplePulseRef.current) window.clearInterval(samplePulseRef.current);
    const stopped = await recorderRef.current?.stop();
    if (stopped && recorderRef.current) {
      setActiveSession(stopped);
      setStatus(recorderRef.current.status);
      setSampleCount(recorderRef.current.getSamples().length);
      onSessionSaved(stopped, recorderRef.current.getSamples());
    }
  }

  const canStart =
    Boolean(mode && settings) &&
    status !== "recording" &&
    snapshot.connected;

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 5</span>
        <h2>New session</h2>
        <p>
          Record controller input while you play, then stop before entering
          optional post-game stats.
        </p>
      </div>

      <div className="metric-row">
        <MetricBadge label="Status" value={status} tone={status === "recording" ? "good" : "neutral"} />
        <MetricBadge label="Samples" value={sampleCount} />
        <MetricBadge
          label="Controller"
          value={snapshot.connected ? "Connected" : "Required"}
          tone={snapshot.connected ? "good" : "warn"}
        />
        <MetricBadge
          label="Telemetry"
          value={activeSession?.hasControllerTelemetry ? "Active" : "Waiting"}
          tone={activeSession?.hasControllerTelemetry ? "good" : "neutral"}
        />
      </div>

      <section className="panel panel--wide">
        <div className="panel__heading">
          <span>{settings?.gameName ?? "No game selected"}</span>
          <strong>{mode ?? "Mode missing"}</strong>
        </div>
        <p className="muted">
          Input samples include timestamp, controller ID, buttons, triggers,
          and stick axes every 50ms.
        </p>
      </section>

      {!snapshot.connected ? (
        <section className="notice-panel notice-panel--warn">
          Connect a controller to start a telemetry session.
        </section>
      ) : null}

      <div className="session-controls">
        <button className="button" disabled={!canStart} onClick={start}>
          Start
        </button>
        <button className="button button--secondary" disabled={status !== "recording"} onClick={pause}>
          Pause
        </button>
        <button className="button button--secondary" disabled={status !== "paused"} onClick={resume}>
          Resume
        </button>
        <button
          className="button button--secondary"
          disabled={!activeSession || status === "stopped"}
          onClick={stop}
        >
          Stop
        </button>
      </div>

      <div className="footer-actions">
        <button className="button" disabled={!activeSession} onClick={onContinue}>
          Add optional post-game stats
        </button>
      </div>
    </main>
  );
}
