import type { Recommendation } from "../types";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

function formatValue(value: string | number) {
  if (typeof value === "number") return value.toFixed(value < 1 ? 2 : 2);
  return value;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const percent =
    recommendation.percentChange !== undefined
      ? `${recommendation.percentChange > 0 ? "+" : ""}${recommendation.percentChange}%`
      : "N/A";

  return (
    <section className="recommendation-card">
      <div className="recommendation-card__top">
        <div>
          <span className="eyebrow">{recommendation.severity}</span>
          <h3>{recommendation.settingName}</h3>
        </div>
        <strong>{recommendation.confidenceScore}% confidence</strong>
      </div>

      <div className="recommendation-card__values">
        <div>
          <span>Current</span>
          <strong>{formatValue(recommendation.currentValue)}</strong>
        </div>
        <div>
          <span>Recommended</span>
          <strong>{formatValue(recommendation.recommendedValue)}</strong>
        </div>
        <div>
          <span>Delta</span>
          <strong>{formatValue(recommendation.exactDelta)}</strong>
        </div>
        <div>
          <span>Percent</span>
          <strong>{percent}</strong>
        </div>
      </div>

      <p>{recommendation.reason}</p>

      <div className="supporting-metrics">
        {Object.entries(recommendation.supportingMetrics).map(([label, value]) => (
          <span key={label}>
            {label}: <strong>{value}</strong>
          </span>
        ))}
      </div>

      <div className="apply-instructions">
        Open your game settings and change {recommendation.settingName.toLowerCase()} from{" "}
        <strong>{formatValue(recommendation.currentValue)}</strong> to{" "}
        <strong>{formatValue(recommendation.recommendedValue)}</strong>.
      </div>
    </section>
  );
}
