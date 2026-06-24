import { useEffect, useMemo, useRef, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import { TargetStage } from "../components/TargetStage";
import {
  calculateCalibrationMetric,
  testsForMode,
  targetForTest,
  type CalibrationSample
} from "../services/calibrationEngine";
import { readGamepadSnapshot, toControllerSample } from "../services/gamepadService";
import { makeId } from "../services/id";
import type { CalibrationMetric, CalibrationMode, CalibrationTest, GameId } from "../types";

interface CalibrationLabProps {
  gameId: GameId;
  onSave: (metric: CalibrationMetric) => void | Promise<void>;
}

type Phase = "idle" | "countdown" | "running" | "saving" | "complete";

function clamp(value: number) {
  return Math.max(0.05, Math.min(0.95, value));
}

export function CalibrationLab({ gameId, onSave }: CalibrationLabProps) {
  const [mode, setMode] = useState<CalibrationMode>("quick");
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [target, setTarget] = useState({ x: 0.5, y: 0.5 });
  const [reticle, setReticle] = useState({ x: 0.5, y: 0.5 });
  const samplesRef = useRef<CalibrationSample[]>([]);
  const reticleRef = useRef({ x: 0.5, y: 0.5 });
  const tests = useMemo(() => testsForMode(mode), [mode]);
  const activeTest = tests[activeIndex];

  useEffect(() => {
    return () => {
      samplesRef.current = [];
    };
  }, []);

  function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function runCountdown() {
    setPhase("countdown");
    for (let value = 3; value > 0; value -= 1) {
      setCountdown(value);
      await wait(1000);
    }
    setCountdown(0);
  }

  async function runSingleTest(test: CalibrationTest) {
    const startedAt = Date.now();
    const runId = makeId("calibration-run");
    const durationMs = test.durationSeconds * 1000;
    reticleRef.current = { x: 0.5, y: 0.5 };
    setPhase("running");
    setProgress(0);
    setSampleCount(samplesRef.current.length);

    return new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = Date.now() - startedAt;
        const snapshot = readGamepadSnapshot();
        const nextTarget = targetForTest(test.id, elapsed);
        const nextReticle = {
          x: clamp(reticleRef.current.x + snapshot.rightX * 0.02),
          y: clamp(reticleRef.current.y + snapshot.rightY * 0.02)
        };
        reticleRef.current = nextReticle;
        setTarget(nextTarget);
        setReticle(nextReticle);
        samplesRef.current.push({
          ...toControllerSample(runId, snapshot),
          testId: test.id,
          targetX: nextTarget.x,
          targetY: nextTarget.y,
          reticleX: nextReticle.x,
          reticleY: nextReticle.y
        });
        setProgress(Math.min(1, elapsed / durationMs));
        setSampleCount(samplesRef.current.length);
        if (elapsed >= durationMs) {
          resolve();
          return;
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });
  }

  async function start(nextMode: CalibrationMode) {
    setMode(nextMode);
    const nextTests = testsForMode(nextMode);
    samplesRef.current = [];
    setSampleCount(0);
    for (let index = 0; index < nextTests.length; index += 1) {
      setActiveIndex(index);
      await runCountdown();
      await runSingleTest(nextTests[index]);
      setPhase("complete");
      await wait(300);
    }
    setPhase("saving");
    const metric = calculateCalibrationMetric(
      makeId("calibration-run"),
      gameId,
      nextMode,
      samplesRef.current
    );
    await onSave(metric);
  }

  return (
    <main className="page page--calibration">
      <div className="page-heading">
        <span className="eyebrow">Step 4</span>
        <h2>Calibration lab</h2>
        <p>Run Quick or Full Calibration. AimTune moves from one test to the next automatically.</p>
      </div>
      <section className="metric-grid">
        <MetricCard label="Mode" value={mode === "quick" ? "Quick" : "Full"} />
        <MetricCard label="Status" value={phase === "countdown" ? `Starting ${countdown}` : phase} />
        <MetricCard label="Test" value={activeTest ? `${activeIndex + 1}/${tests.length}` : "Ready"} />
        <MetricCard label="Samples" value={sampleCount} />
      </section>
      <div className="calibration-actions">
        <button className="button" disabled={phase === "running" || phase === "countdown"} onClick={() => start("quick")}>
          Start Quick Calibration
        </button>
        <button className="button button--secondary" disabled={phase === "running" || phase === "countdown"} onClick={() => start("full")}>
          Start Full Calibration
        </button>
      </div>
      <section className="current-test">
        <div>
          <span className="eyebrow">Current test</span>
          <h3>{activeTest?.name ?? "Ready"}</h3>
          <p>{activeTest?.instructions ?? "Choose a calibration mode to begin."}</p>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </section>
      <div className="calibration-layout">
        <TargetStage target={target} reticle={reticle} label={activeTest?.name ?? "Ready"} />
        <div className="test-card-grid">
          {tests.map((test, index) => (
            <article className={`test-card ${index === activeIndex ? "is-active" : ""}`} key={test.id}>
              <h3>{test.name}</h3>
              <p>{test.purpose}</p>
              <span>Status: {index < activeIndex ? "Complete" : index === activeIndex && phase !== "idle" ? phase : "Not started"}</span>
              <small>{test.metrics.join(", ")}</small>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
