import { RecommendationCard } from "../components/RecommendationCard";
import type { AnalysisSummary, Recommendation } from "../types";

interface RecommendationReportProps {
  recommendations: Recommendation[];
  analysis?: AnalysisSummary;
  onDashboard: () => void;
}

export function RecommendationReport({
  recommendations,
  analysis,
  onDashboard
}: RecommendationReportProps) {
  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 6</span>
        <h2>Recommendation report</h2>
        <p>
          Exact manual setting changes from calibration, controller telemetry,
          capture metrics, cautious local vision signals, and optional stats.
        </p>
      </div>
      {analysis ? (
        <section className="privacy-strip">
          <strong>Vision status: {analysis.modelStatus}</strong>
          <span>
            {analysis.detectionCount} candidate detections across {analysis.sampleCount} samples.
          </span>
        </section>
      ) : null}
      {recommendations.length ? (
        <section className="recommendation-list">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))}
        </section>
      ) : (
        <section className="notice">
          No recommendations yet. Calibration is required before AimTune creates exact setting changes.
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
