import { stepOrder } from "../state/useAimTuneApp";
import type { AppStep } from "../types";

interface ProgressRailProps {
  active: AppStep;
  canVisit: (step: AppStep) => boolean;
  onVisit: (step: AppStep) => void;
}

export function ProgressRail({ active, canVisit, onVisit }: ProgressRailProps) {
  return (
    <nav className="progress-rail" aria-label="AimTune flow">
      {stepOrder.map((step, index) => (
        <button
          className={active === step.id ? "is-active" : ""}
          disabled={!canVisit(step.id)}
          key={step.id}
          onClick={() => onVisit(step.id)}
        >
          <span>{index + 1}</span>
          {step.label}
        </button>
      ))}
    </nav>
  );
}
