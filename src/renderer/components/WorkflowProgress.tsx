import type {
  AppMode,
  CalibrationMetrics,
  CurrentSettings,
  Recommendation,
  Session
} from "../types";

interface WorkflowProgressProps {
  mode?: AppMode;
  settings?: CurrentSettings;
  calibrationMetrics?: CalibrationMetrics;
  session?: Session;
  recommendations: Recommendation[];
}

function modeLabel(mode?: AppMode) {
  if (!mode) return "Choose a mode";
  if (mode === "pc") return "PC telemetry";
  return "Remote Play telemetry";
}

export function WorkflowProgress({
  mode,
  settings,
  calibrationMetrics,
  session,
  recommendations
}: WorkflowProgressProps) {
  const steps = [
    {
      label: "Mode",
      value: modeLabel(mode),
      complete: Boolean(mode)
    },
    {
      label: "Settings",
      value: settings ? settings.gameName : "Current values needed",
      complete: Boolean(settings)
    },
    {
      label: "Calibration",
      value: calibrationMetrics ? "Metrics saved" : "Run Calibration Lab",
      complete: Boolean(calibrationMetrics)
    },
    {
      label: "Session",
      value: session ? "Session created" : "Record controller input",
      complete: Boolean(session)
    },
    {
      label: "Report",
      value: recommendations.length
        ? `${recommendations.length} exact changes`
        : "Awaiting calibration results",
      complete: recommendations.length > 0
    }
  ];

  return (
    <section className="workflow-progress" aria-label="AimTune setup progress">
      {steps.map((step, index) => (
        <div
          className={`workflow-progress__item ${step.complete ? "is-complete" : ""}`}
          key={step.label}
        >
          <span>{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <small>{step.value}</small>
          </div>
        </div>
      ))}
    </section>
  );
}
