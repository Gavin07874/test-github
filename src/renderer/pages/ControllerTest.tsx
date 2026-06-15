import { useEffect, useState } from "react";
import { ControllerVisualizer } from "../components/ControllerVisualizer";
import { MetricBadge } from "../components/MetricBadge";
import {
  emptyGamepadSnapshot,
  startGamepadLoop
} from "../services/gamepadService";
import type { AppMode, GamepadSnapshot } from "../types";

interface ControllerTestProps {
  mode?: AppMode;
  onContinue: () => void;
}

export function ControllerTest({ mode, onContinue }: ControllerTestProps) {
  const [snapshot, setSnapshot] = useState<GamepadSnapshot>(emptyGamepadSnapshot);

  useEffect(() => startGamepadLoop(setSnapshot), []);

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 2</span>
        <h2>Controller test</h2>
        <p>
          Move your sticks and press buttons to confirm controller telemetry is visible.
        </p>
      </div>

      <div className="metric-row">
        <MetricBadge
          label="Connection"
          value={snapshot.connected ? "Detected" : "Not detected"}
          tone={snapshot.connected ? "good" : "warn"}
        />
        <MetricBadge label="Mode" value={mode ?? "Not selected"} />
        <MetricBadge label="Polling" value="requestAnimationFrame" />
      </div>

      <ControllerVisualizer snapshot={snapshot} />

      <div className="footer-actions">
        <button className="button" onClick={onContinue}>
          Continue to settings
        </button>
      </div>
    </main>
  );
}
