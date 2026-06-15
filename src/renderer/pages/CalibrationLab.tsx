import { useEffect, useMemo, useRef, useState } from "react";
import { CalibrationTestCard } from "../components/CalibrationTestCard";
import { MetricBadge } from "../components/MetricBadge";
import { TargetCanvas } from "../components/TargetCanvas";
import {
  calculateCalibrationMetrics,
  calibrationTests,
  createCalibrationSample
} from "../services/calibrationEngine";
import {
  emptyGamepadSnapshot,
  readPrimaryGamepadSnapshot,
  startGamepadLoop
} from "../services/gamepadService";
import type {
  AppMode,
  CalibrationMetrics,
  CalibrationSample,
  CalibrationTestDefinition,
  CalibrationTestId,
  CurrentSettings
} from "../types";

type CalibrationRunMode = "quick" | "full";
type RunPhase = "idle" | "countdown" | "running" | "saving" | "complete";

interface CalibrationLabProps {
  mode?: AppMode;
  settings?: CurrentSettings;
  metrics?: CalibrationMetrics;
  onSave: (metrics: CalibrationMetrics) => void | Promise<void>;
}

const calibrationModeTests: Record<CalibrationRunMode, CalibrationTestId[]> = {
  quick: ["drift", "micro", "flick"],
  full: ["drift", "micro", "flick", "tracking", "turn", "ads"]
};

function clampUnit(value: number) {
  return Math.min(0.95, Math.max(0.05, value));
}

function targetFor(testId: CalibrationTestId, elapsedMs: number) {
  const seconds = elapsedMs / 1000;
  if (testId === "drift") return { x: 0.5, y: 0.5 };
  if (testId === "micro") {
    return {
      x: 0.5 + Math.sin(seconds * 2.1) * 0.12,
      y: 0.5 + Math.cos(seconds * 1.7) * 0.1
    };
  }
  if (testId === "flick") {
    const step = Math.floor(seconds * 1.2);
    return {
      x: 0.2 + ((step * 37) % 60) / 100,
      y: 0.22 + ((step * 53) % 56) / 100
    };
  }
  if (testId === "tracking") {
    return {
      x: 0.5 + Math.sin(seconds * 1.25) * 0.3,
      y: 0.5 + Math.cos(seconds * 0.85) * 0.22
    };
  }
  if (testId === "turn") {
    return {
      x: seconds % 2 < 1 ? 0.12 : 0.88,
      y: 0.5
    };
  }
  return {
    x: 0.5 + Math.sin(seconds * 1.4) * 0.18,
    y: 0.5 + Math.cos(seconds * 1.1) * 0.16
  };
}

function testsForMode(runMode: CalibrationRunMode) {
  const ids = new Set(calibrationModeTests[runMode]);
  return calibrationTests.filter((test) => ids.has(test.id));
}

function phaseLabel(phase: RunPhase, countdown: number) {
  if (phase === "countdown") return `Starting in ${countdown}`;
  if (phase === "running") return "Running";
  if (phase === "saving") return "Saving metrics";
  if (phase === "complete") return "Complete";
  return "Ready";
}

export function CalibrationLab({
  mode,
  settings,
  metrics,
  onSave
}: CalibrationLabProps) {
  const [displayMode, setDisplayMode] = useState<CalibrationRunMode>("quick");
  const [runningMode, setRunningMode] = useState<CalibrationRunMode | undefined>();
  const [runPhase, setRunPhase] = useState<RunPhase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [liveSampleCount, setLiveSampleCount] = useState(0);
  const [samplesByTest, setSamplesByTest] = useState<
    Partial<Record<CalibrationTestId, CalibrationSample[]>>
  >({});
  const [activeTest, setActiveTest] = useState<CalibrationTestId | undefined>();
  const [target, setTarget] = useState({ x: 0.5, y: 0.5 });
  const [reticle, setReticle] = useState({ x: 0.5, y: 0.5 });
  const [snapshot, setSnapshot] = useState(emptyGamepadSnapshot);
  const frameRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<number | undefined>(undefined);
  const cancelRunRef = useRef(false);
  const reticleRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const stopLoop = startGamepadLoop(setSnapshot);
    return () => {
      cancelRunRef.current = true;
      stopLoop();
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const telemetryReady = snapshot.connected;
  const isRunning = Boolean(runningMode) && runPhase !== "idle";
  const visibleTests = useMemo(() => testsForMode(displayMode), [displayMode]);
  const activeDefinition = activeTest
    ? calibrationTests.find((test) => test.id === activeTest)
    : undefined;
  const completedCount = visibleTests.filter(
    (test) => (samplesByTest[test.id]?.length ?? 0) > 0
  ).length;
  const totalTests = visibleTests.length;
  const currentTestNumber = Math.min(currentTestIndex + 1, totalTests);
  const runStatus = phaseLabel(runPhase, countdown);
  const startDisabled = !telemetryReady || !settings || !mode || isRunning;

  function delay(ms: number) {
    return new Promise<void>((resolve) => {
      timeoutRef.current = window.setTimeout(resolve, ms);
    });
  }

  async function runCountdown() {
    setRunPhase("countdown");
    setProgress(0);
    setLiveSampleCount(0);
    for (let value = 3; value > 0; value -= 1) {
      if (cancelRunRef.current) return false;
      setCountdown(value);
      await delay(1000);
    }
    setCountdown(0);
    return !cancelRunRef.current;
  }

  function runSingleTest(test: CalibrationTestDefinition) {
    return new Promise<CalibrationSample[]>((resolve) => {
      const startedAt = Date.now();
      const localSamples: CalibrationSample[] = [];
      const durationMs = test.durationSeconds * 1000;

      reticleRef.current = { x: 0.5, y: 0.5 };
      setReticle(reticleRef.current);
      setRunPhase("running");
      setProgress(0);
      setLiveSampleCount(0);

      const tick = () => {
        if (cancelRunRef.current) {
          frameRef.current = undefined;
          resolve(localSamples);
          return;
        }

        const elapsedMs = Date.now() - startedAt;
        const snapshot = readPrimaryGamepadSnapshot();
        const nextTarget = targetFor(test.id, elapsedMs);
        const nextReticle = {
          x: clampUnit(reticleRef.current.x + snapshot.rightStickX * 0.018),
          y: clampUnit(reticleRef.current.y + snapshot.rightStickY * 0.018)
        };

        reticleRef.current = nextReticle;
        setTarget(nextTarget);
        setReticle(nextReticle);
        localSamples.push(
          createCalibrationSample(test.id, snapshot, startedAt, nextTarget, nextReticle)
        );
        setProgress(Math.min(1, elapsedMs / durationMs));
        setLiveSampleCount(localSamples.length);

        if (elapsedMs >= durationMs) {
          frameRef.current = undefined;
          resolve(localSamples);
          return;
        }

        frameRef.current = window.requestAnimationFrame(tick);
      };

      frameRef.current = window.requestAnimationFrame(tick);
    });
  }

  async function startCalibration(nextMode: CalibrationRunMode) {
    if (startDisabled) return;

    cancelRunRef.current = false;
    setDisplayMode(nextMode);
    setRunningMode(nextMode);
    setSamplesByTest({});
    setActiveTest(undefined);
    setProgress(0);
    setLiveSampleCount(0);

    const tests = testsForMode(nextMode);
    const nextSamplesByTest: Partial<Record<CalibrationTestId, CalibrationSample[]>> =
      {};

    for (let index = 0; index < tests.length; index += 1) {
      const test = tests[index];
      setCurrentTestIndex(index);
      setActiveTest(test.id);

      const canStart = await runCountdown();
      if (!canStart) return;

      const testSamples = await runSingleTest(test);
      if (cancelRunRef.current) return;

      nextSamplesByTest[test.id] = testSamples;
      setSamplesByTest({ ...nextSamplesByTest });
      setRunPhase("complete");
      setProgress(1);
      await delay(350);
    }

    setActiveTest(undefined);
    setCurrentTestIndex(tests.length - 1);
    setRunPhase("saving");
    setProgress(1);

    const sessionId = settings.sessionId ?? settings.id ?? crypto.randomUUID();
    const nextMetrics = calculateCalibrationMetrics(sessionId, nextSamplesByTest);
    await onSave(nextMetrics);
  }

  return (
    <main className="page page--calibration">
      <div className="calibration-topline">
        <div className="page-heading calibration-heading">
          <span className="eyebrow">Step 4</span>
          <h2>Calibration lab</h2>
          <p>
            Choose Quick or Full Calibration. AimTune moves through the tests
            automatically and opens Gameplay Capture when finished.
          </p>
        </div>

        <div className="metric-row calibration-summary">
          <MetricBadge label="Tests complete" value={`${completedCount}/${totalTests}`} />
          <MetricBadge label="Mode" value={displayMode === "quick" ? "Quick" : "Full"} />
          <MetricBadge
            label="Controller"
            value={snapshot.connected ? "Connected" : "Required"}
            tone={snapshot.connected ? "good" : "warn"}
          />
          <MetricBadge
            label="Saved metrics"
            value={metrics ? "Available" : "Not saved"}
            tone={metrics ? "good" : "neutral"}
          />
        </div>
      </div>

      <div className="calibration-controls">
        <button
          className="button"
          disabled={startDisabled}
          onClick={() => startCalibration("quick")}
        >
          Start Quick Calibration
        </button>
        <button
          className="button button--secondary"
          disabled={startDisabled}
          onClick={() => startCalibration("full")}
        >
          Start Full Calibration
        </button>
        <span>
          Quick runs Drift, Micro-Aim, and Flick. Full adds Tracking,
          Turn-Speed, and ADS Stability.
        </span>
      </div>

      <section className="current-test-panel">
        <div>
          <span className="eyebrow">Current test</span>
          <h3>{activeDefinition?.title ?? "Ready to calibrate"}</h3>
          <p>
            {activeDefinition?.objective ??
              "Connect a controller, choose a calibration length, and keep this window focused while tests run."}
          </p>
        </div>
        <div className="current-test-panel__status">
          <MetricBadge label="Status" value={runStatus} tone={isRunning ? "warn" : "neutral"} />
          <MetricBadge
            label="Test"
            value={activeDefinition ? `${currentTestNumber}/${totalTests}` : `0/${totalTests}`}
          />
          <MetricBadge label="Live progress" value={`${Math.round(progress * 100)}%`} />
          <MetricBadge label="Samples" value={liveSampleCount} />
        </div>
        <div className="progress-bar" aria-label="Live calibration progress">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="current-test-panel__metrics">
          <strong>Metrics being captured</strong>
          <p>
            {activeDefinition
              ? activeDefinition.metricsCollected.join(", ")
              : visibleTests.flatMap((test) => test.metricsCollected).slice(0, 8).join(", ")}
          </p>
        </div>
        {runPhase === "countdown" ? (
          <div className="calibration-countdown">{countdown}</div>
        ) : null}
      </section>

      <div className="lab-layout">
        <TargetCanvas
          target={target}
          reticle={reticle}
          activeLabel={activeDefinition?.title ?? "Ready"}
        />

        <div className="test-grid">
          {visibleTests.map((test) => (
            <CalibrationTestCard
              key={test.id}
              test={test}
              sampleCount={samplesByTest[test.id]?.length ?? 0}
              active={activeTest === test.id}
            />
          ))}
        </div>
      </div>

      <div className="footer-actions footer-actions--calibration">
        {!snapshot.connected ? (
          <span className="calibration-action-note">
            Connect a controller to run tests.
          </span>
        ) : null}
        {runPhase === "saving" ? (
          <span className="calibration-action-note">
            Saving metrics and opening Gameplay Capture.
          </span>
        ) : null}
      </div>
    </main>
  );
}
