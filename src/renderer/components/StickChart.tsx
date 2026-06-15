interface StickChartProps {
  label: string;
  x: number;
  y: number;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function StickChart({ label, x, y }: StickChartProps) {
  const dotX = clampPercent(50 + x * 45);
  const dotY = clampPercent(50 + y * 45);

  return (
    <div className="stick-chart" aria-label={`${label} stick position`}>
      <div className="stick-chart__label">
        <span>{label}</span>
        <strong>
          X {x.toFixed(2)} / Y {y.toFixed(2)}
        </strong>
      </div>
      <div className="stick-chart__pad">
        <span className="stick-chart__axis stick-chart__axis--x" />
        <span className="stick-chart__axis stick-chart__axis--y" />
        <span
          className="stick-chart__dot"
          style={{ left: `${dotX}%`, top: `${dotY}%` }}
        />
      </div>
    </div>
  );
}
