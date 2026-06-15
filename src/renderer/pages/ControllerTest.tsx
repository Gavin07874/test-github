import { useEffect, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import { emptySnapshot, startGamepadLoop, type GamepadSnapshot } from "../services/gamepadService";
import type { AppMode } from "../types";

interface ControllerTestProps {
  mode?: AppMode;
  onContinue: () => void;
}

export function ControllerTest({ mode, onContinue }: ControllerTestProps) {
  const [snapshot, setSnapshot] = useState<GamepadSnapshot>(emptySnapshot);

  useEffect(() => startGamepadLoop(setSnapshot), []);

  const activeButtons = snapshot.buttons
    .filter((button) => button.pressed || button.value > 0.45)
    .map((button) => button.index);

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 2</span>
        <h2>Controller test</h2>
        <p>Move the sticks and press buttons to confirm controller telemetry is visible.</p>
      </div>
      <section className="metric-grid">
        <MetricCard label="Connection" value={snapshot.connected ? "Connected" : "Waiting"} tone={snapshot.connected ? "good" : "warn"} />
        <MetricCard label="Mode" value={mode === "console_remote_play" ? "Remote Play" : "PC"} />
        <MetricCard label="Controller" value={snapshot.id ?? "Not detected"} />
        <MetricCard label="Active buttons" value={activeButtons.length ? activeButtons.join(", ") : "None"} />
      </section>
      <section className="controller-panel">
        <div className="stick-pad" aria-label="Left stick">
          <span style={{ left: `${50 + snapshot.leftX * 45}%`, top: `${50 + snapshot.leftY * 45}%` }} />
          <strong>Left stick</strong>
        </div>
        <div className="stick-pad" aria-label="Right stick">
          <span style={{ left: `${50 + snapshot.rightX * 45}%`, top: `${50 + snapshot.rightY * 45}%` }} />
          <strong>Right stick</strong>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <span>Raw values</span>
            <strong>{snapshot.axes.length} axes</strong>
          </div>
          <div className="raw-list">
            <span>LX {snapshot.leftX.toFixed(2)}</span>
            <span>LY {snapshot.leftY.toFixed(2)}</span>
            <span>RX {snapshot.rightX.toFixed(2)}</span>
            <span>RY {snapshot.rightY.toFixed(2)}</span>
            <span>LT {snapshot.leftTrigger.toFixed(2)}</span>
            <span>RT {snapshot.rightTrigger.toFixed(2)}</span>
          </div>
          <button className="button" onClick={onContinue}>
            Continue to settings
          </button>
        </div>
      </section>
    </main>
  );
}
