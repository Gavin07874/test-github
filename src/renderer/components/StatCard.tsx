interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <section className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </section>
  );
}
