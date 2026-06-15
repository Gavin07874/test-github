import type { CalibrationTestDefinition } from "../types";

type TestStatus = "Not started" | "Running" | "Complete";

interface CalibrationTestCardProps {
  test: CalibrationTestDefinition;
  sampleCount: number;
  active: boolean;
}

export function CalibrationTestCard({
  test,
  sampleCount,
  active
}: CalibrationTestCardProps) {
  const status: TestStatus = active
    ? "Running"
    : sampleCount > 0
      ? "Complete"
      : "Not started";

  return (
    <section className={`test-card ${active ? "is-active" : ""}`}>
      <div>
        <h3>{test.title}</h3>
        <p className="test-card__instructions">
          <strong>Instructions:</strong> {test.objective}
        </p>
      </div>
      <p className="test-card__metric-list">
        <strong>Metrics:</strong> {test.metricsCollected.join(", ")}
      </p>
      <div className="test-card__footer">
        <span
          className={`test-card__status ${
            active ? "is-running" : sampleCount > 0 ? "is-complete" : ""
          }`}
        >
          Status: <strong>{status}</strong>
        </span>
        <span className="test-card__completion">
          {sampleCount > 0 ? "Captured" : active ? "Capturing" : "Waiting"}
        </span>
      </div>
    </section>
  );
}
