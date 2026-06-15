interface TargetCanvasProps {
  target: { x: number; y: number };
  reticle: { x: number; y: number };
  activeLabel?: string;
}

function toPercent(value: number) {
  return `${Math.min(96, Math.max(4, value * 100))}%`;
}

export function TargetCanvas({ target, reticle, activeLabel }: TargetCanvasProps) {
  return (
    <div className="target-canvas">
      <div className="target-canvas__grid" />
      <span
        className="target-canvas__target"
        style={{ left: toPercent(target.x), top: toPercent(target.y) }}
      />
      <span
        className="target-canvas__reticle"
        style={{ left: toPercent(reticle.x), top: toPercent(reticle.y) }}
      />
      <div className="target-canvas__status">
        <span>{activeLabel ?? "Calibration canvas"}</span>
        <strong>Controller reticle</strong>
      </div>
    </div>
  );
}
