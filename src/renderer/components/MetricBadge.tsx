interface MetricBadgeProps {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "danger";
}

export function MetricBadge({ label, value, tone = "neutral" }: MetricBadgeProps) {
  return (
    <div className={`metric-badge metric-badge--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
