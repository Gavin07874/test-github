import { RecommendationCard } from "../components/RecommendationCard";
import type { Recommendation } from "../types";

interface RecommendationReportProps {
  recommendations: Recommendation[];
  onDashboard: () => void;
}

export function RecommendationReport({
  recommendations,
  onDashboard
}: RecommendationReportProps) {
  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 7</span>
        <h2>Recommendation report</h2>
        <p>Exact setting changes generated only after Calibration Lab metrics exist.</p>
      </div>

      {recommendations.length ? (
        <div className="recommendation-list">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))}
        </div>
      ) : (
        <section className="notice-panel">
          No exact changes are available yet. Complete Calibration Lab tests and
          save calibration metrics before generating a report.
        </section>
      )}

      <div className="footer-actions">
        <button className="button" onClick={onDashboard}>
          View dashboard
        </button>
      </div>
    </main>
  );
}
