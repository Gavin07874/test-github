import type { Recommendation } from "../types";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

function format(value: number | string | boolean) {
  if (typeof value === "number") return value < 1 ? value.toFixed(2) : value.toFixed(1);
  if (typeof value === "boolean") return value ? "On" : "Off";
  return value;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <article className="recommendation-card">
      <div className="recommendation-card__top">
        <div>
          <span className="eyebrow">{recommendation.severity}</span>
          <h3>{recommendation.settingLabel}</h3>
        </div>
        <strong>{recommendation.confidence}% confidence</strong>
      </div>
      <div className="recommendation-values">
        <div>
          <span>Current</span>
          <strong>{format(recommendation.currentValue)}</strong>
        </div>
        <div>
          <span>Recommended</span>
          <strong>{format(recommendation.recommendedValue)}</strong>
        </div>
        <div>
          <span>Delta</span>
          <strong>{format(recommendation.exactDelta)}</strong>
        </div>
      </div>
      <p>{recommendation.reason}</p>
      <div className="support-list">
        {Object.entries(recommendation.supportingMetrics).map(([label, value]) => (
          <span key={label}>
            {label}: <strong>{value}</strong>
          </span>
        ))}
      </div>
      <div className="apply-note">
        Open the game settings and manually change {recommendation.settingLabel} from{" "}
        <strong>{format(recommendation.currentValue)}</strong> to{" "}
        <strong>{format(recommendation.recommendedValue)}</strong>.
      </div>
    </article>
  );
}
