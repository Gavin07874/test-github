interface TargetStageProps {
  target: { x: number; y: number };
  reticle: { x: number; y: number };
  label: string;
}

export function TargetStage({ target, reticle, label }: TargetStageProps) {
  return (
    <section className="target-stage">
      <div className="target-grid" />
      <div
        className="target-dot"
        style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}
      />
      <div
        className="reticle"
        style={{ left: `${reticle.x * 100}%`, top: `${reticle.y * 100}%` }}
      />
      <div className="stage-caption">
        <strong>{label}</strong>
        <span>Controller reticle</span>
      </div>
    </section>
  );
}
