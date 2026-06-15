import type { AppMode } from "../types";

interface ModeSelectProps {
  selectedMode?: AppMode;
  onSelect: (mode: AppMode) => void;
}

const modes: Array<{
  id: AppMode;
  title: string;
  body: string;
  telemetry: string;
}> = [
  {
    id: "pc",
    title: "PC Mode",
    body: "Use this when you play a PC game with a controller connected to the computer.",
    telemetry: "Records controller telemetry through the Browser Gamepad API."
  },
  {
    id: "console_remote_play",
    title: "Console Remote Play Mode",
    body: "Use this when you play PlayStation or Xbox through Remote Play on Mac or PC.",
    telemetry: "Records the controller connected to this computer, not the console."
  }
];

export function ModeSelect({ selectedMode, onSelect }: ModeSelectProps) {
  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 1</span>
        <h2>Select mode</h2>
        <p>Choose the controller telemetry source AimTune AI should use for calibration.</p>
      </div>

      <div className="mode-grid">
        {modes.map((mode) => (
          <button
            className={`mode-card ${selectedMode === mode.id ? "is-selected" : ""}`}
            key={mode.id}
            onClick={() => onSelect(mode.id)}
          >
            <span>{mode.title}</span>
            <strong>{mode.body}</strong>
            <small>{mode.telemetry}</small>
          </button>
        ))}
      </div>
    </main>
  );
}
