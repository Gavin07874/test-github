import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { MetricCard } from "../components/MetricCard";
import { RecommendationCard } from "../components/RecommendationCard";
import { storageService } from "../services/storageService";
import type {
  AnalysisSummary,
  CalibrationMetric,
  CaptureSession,
  PostGameStats,
  Recommendation
} from "../types";

interface DashboardProps {
  recommendations: Recommendation[];
  onReset: () => void | Promise<void>;
}

export function Dashboard({ recommendations, onReset }: DashboardProps) {
  const [calibrations, setCalibrations] = useState<CalibrationMetric[]>([]);
  const [captures, setCaptures] = useState<CaptureSession[]>([]);
  const [summaries, setSummaries] = useState<AnalysisSummary[]>([]);
  const [stats, setStats] = useState<PostGameStats[]>([]);
  const [resetArmed, setResetArmed] = useState(false);
  const [exportStatus, setExportStatus] = useState("Ready");

  async function load() {
    const [loadedCalibrations, loadedCaptures, loadedSummaries, loadedStats] =
      await Promise.all([
        storageService.listCalibrationMetrics(),
        storageService.listCaptureSessions(),
        storageService.listAnalysisSummaries(),
        storageService.listPostGameStats()
      ]);
    setCalibrations(loadedCalibrations);
    setCaptures(loadedCaptures);
    setSummaries(loadedSummaries);
    setStats(loadedStats);
  }

  useEffect(() => {
    void load();
  }, []);

  const latestSummary = summaries[summaries.length - 1];
  const chartData = useMemo(
    () =>
      summaries.map((summary, index) => ({
        name: `C${index + 1}`,
        stability: summary.averageStability,
        proximity: summary.averageTargetProximity,
        confidence: summary.targetSignalConfidence
      })),
    [summaries]
  );

  async function exportLocalSnapshot() {
    const snapshot = await storageService.exportSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aimtune-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportStatus("Downloaded");
  }

  async function reset() {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    await onReset();
    setResetArmed(false);
    await load();
  }

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Overview</span>
        <h2>Dashboard</h2>
        <p>Local calibration, capture, recommendation, and export status.</p>
      </div>
      <section className="metric-grid">
        <MetricCard label="Calibrations" value={calibrations.length} />
        <MetricCard label="Capture sessions" value={captures.length} />
        <MetricCard label="Model status" value={latestSummary?.modelStatus ?? "N/A"} />
        <MetricCard label="Stability" value={latestSummary ? `${Math.round(latestSummary.averageStability)}%` : "N/A"} />
        <MetricCard label="Recommendations" value={recommendations.length} />
        <MetricCard label="Post-game stats" value={stats.length} />
      </section>
      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <span>Local data</span>
            <strong>{exportStatus}</strong>
          </div>
          <p>Exports contain metrics and summaries only, never visual media.</p>
          <div className="footer-actions">
            <button className="button" onClick={exportLocalSnapshot}>Export local snapshot</button>
            <button className={`button ${resetArmed ? "button--danger" : "button--secondary"}`} onClick={reset}>
              {resetArmed ? "Click again to clear" : "Clear local data"}
            </button>
          </div>
        </div>
        <div className="chart-panel">
          <div className="panel-heading">
            <span>Capture trend</span>
            <strong>{chartData.length} entries</strong>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="stability" stroke="#0c8f7a" strokeWidth={2} />
              <Line type="monotone" dataKey="proximity" stroke="#e05d3f" strokeWidth={2} />
              <Line type="monotone" dataKey="confidence" stroke="#6b5cff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      {recommendations.length ? (
        <section className="recommendation-list">
          {recommendations.slice(0, 3).map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </section>
      ) : (
        <section className="notice">Run calibration before recommendations appear.</section>
      )}
    </main>
  );
}
