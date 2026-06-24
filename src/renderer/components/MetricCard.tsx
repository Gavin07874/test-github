interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}

export function MetricCard({ label, value, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
