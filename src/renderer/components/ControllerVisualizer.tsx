import type { GamepadSnapshot } from "../types";
import { MetricBadge } from "./MetricBadge";
import { StickChart } from "./StickChart";

interface ControllerVisualizerProps {
  snapshot: GamepadSnapshot;
}

export function ControllerVisualizer({ snapshot }: ControllerVisualizerProps) {
  const pressed = snapshot.buttons.filter((button) => button.pressed || button.value > 0.5);

  return (
    <div className="controller-grid">
      <section className="panel">
        <div className="panel__heading">
          <span>Controller</span>
          <strong>{snapshot.connected ? "Connected" : "Waiting"}</strong>
        </div>
        <p className="muted">
          {snapshot.connected ? snapshot.id : "Press a button or move a stick on a connected controller."}
        </p>
        <div className="metric-row">
          <MetricBadge
            label="Status"
            value={snapshot.connected ? "Live" : "No signal"}
            tone={snapshot.connected ? "good" : "warn"}
          />
          <MetricBadge label="Buttons" value={pressed.length} />
          <MetricBadge label="Axes" value={snapshot.axes.length} />
        </div>
      </section>

      <StickChart label="Left Stick" x={snapshot.leftStickX} y={snapshot.leftStickY} />
      <StickChart label="Right Stick" x={snapshot.rightStickX} y={snapshot.rightStickY} />

      <section className="panel">
        <div className="panel__heading">
          <span>Triggers</span>
          <strong>
            L {snapshot.leftTrigger.toFixed(2)} / R {snapshot.rightTrigger.toFixed(2)}
          </strong>
        </div>
        <div className="trigger-pair">
          <div>
            <span>Left</span>
            <meter min="0" max="1" value={snapshot.leftTrigger} />
          </div>
          <div>
            <span>Right</span>
            <meter min="0" max="1" value={snapshot.rightTrigger} />
          </div>
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__heading">
          <span>Live Buttons</span>
          <strong>{pressed.map((button) => button.index).join(", ") || "None"}</strong>
        </div>
        <div className="button-grid">
          {snapshot.buttons.map((button) => (
            <span
              className={`button-pill ${button.pressed || button.value > 0.5 ? "is-active" : ""}`}
              key={button.index}
            >
              {button.index}: {button.value.toFixed(2)}
            </span>
          ))}
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__heading">
          <span>Raw Axes</span>
          <strong>{snapshot.axes.length ? "Streaming" : "None"}</strong>
        </div>
        <div className="raw-list">
          {snapshot.axes.map((axis, index) => (
            <span key={index}>
              Axis {index}: <strong>{axis.toFixed(4)}</strong>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
