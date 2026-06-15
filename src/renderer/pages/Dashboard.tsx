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
import { MetricBadge } from "../components/MetricBadge";
import { RecommendationCard } from "../components/RecommendationCard";
import { StatCard } from "../components/StatCard";
import { storageService } from "../services/storageService";
import type {
  CalibrationMetrics,
  PostGameStats,
  Recommendation,
  Session
} from "../types";

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function kd(stats: PostGameStats) {
  return stats.kills / Math.max(1, stats.deaths);
}

export function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<PostGameStats[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [metrics, setMetrics] = useState<CalibrationMetrics[]>([]);

  useEffect(() => {
    async function load() {
      const [loadedSessions, loadedStats, loadedRecommendations, loadedMetrics] =
        await Promise.all([
          storageService.listSessions(),
          storageService.listPostGameStats(),
          storageService.listRecommendations(),
          storageService.listCalibrationMetrics()
        ]);
      setSessions(loadedSessions);
      setStats(loadedStats);
      setRecommendations(loadedRecommendations);
      setMetrics(loadedMetrics);
    }
    void load();
  }, []);

  const calibrationComplete = metrics.length > 0;
  const visibleRecommendations = calibrationComplete ? recommendations : [];

  const summary = useMemo(() => {
    const latestSensitivity = visibleRecommendations.find(
      (recommendation) => recommendation.settingName === "Horizontal Sensitivity"
    );
    const latestAds = visibleRecommendations.find(
      (recommendation) => recommendation.settingName === "ADS Sensitivity"
    );
    const latestDeadzone = visibleRecommendations.find(
      (recommendation) => recommendation.settingName === "Right-stick Deadzone"
    );

    return {
      totalSessions: sessions.length,
      calibrationComplete,
      averageKd: average(stats.map(kd)),
      averageAccuracy: average(
        stats
          .map((item) => item.accuracyPercent)
          .filter((value): value is number => value !== undefined)
      ),
      averageHeadshotPercent: average(
        stats
          .map((item) => item.headshotPercent)
          .filter((value): value is number => value !== undefined)
      ),
      currentSensitivity: latestSensitivity
        ? String(latestSensitivity.recommendedValue)
        : "N/A",
      currentAdsSensitivity: latestAds ? String(latestAds.recommendedValue) : "N/A",
      currentDeadzone: latestDeadzone ? String(latestDeadzone.recommendedValue) : "N/A"
    };
  }, [calibrationComplete, sessions.length, stats, visibleRecommendations]);

  const performanceData = stats.map((item, index) => ({
    name: `S${index + 1}`,
    accuracy: item.accuracyPercent ?? 0,
    kd: Number(kd(item).toFixed(2)),
    headshot: item.headshotPercent ?? 0
  }));

  const recommendationData = visibleRecommendations
    .filter((item) => typeof item.recommendedValue === "number")
    .slice()
    .reverse()
    .map((item, index) => ({
      name: `R${index + 1}`,
      value: Number(item.recommendedValue),
      confidence: item.confidenceScore,
      setting: item.settingName
    }));

  const calibrationData = metrics.map((item, index) => ({
    name: `C${index + 1}`,
    drift: item.rightStickDriftAverage,
    tracking: item.trackingErrorAverage,
    ads: item.adsJitter
  }));

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Overview</span>
        <h2>Dashboard</h2>
        <p>Session history, calibration status, recommendation trends, and core performance metrics.</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Total sessions" value={summary.totalSessions} />
        <StatCard
          label="Calibration"
          value={summary.calibrationComplete ? "Complete" : "Pending"}
        />
        <StatCard label="Average K/D" value={summary.averageKd.toFixed(2)} />
        <StatCard label="Average accuracy" value={`${summary.averageAccuracy.toFixed(1)}%`} />
        <StatCard label="Average headshot" value={`${summary.averageHeadshotPercent.toFixed(1)}%`} />
        <StatCard label="Current horizontal" value={summary.currentSensitivity} />
        <StatCard label="Current ADS" value={summary.currentAdsSensitivity} />
        <StatCard label="Current deadzone" value={summary.currentDeadzone} />
      </div>

      <div className="dashboard-grid">
        <section className="chart-panel">
          <div className="panel__heading">
            <span>Accuracy and K/D over sessions</span>
            <strong>{performanceData.length} entries</strong>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#0c8f7a" strokeWidth={2} />
              <Line type="monotone" dataKey="kd" stroke="#e05d3f" strokeWidth={2} />
              <Line type="monotone" dataKey="headshot" stroke="#7b61ff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-panel">
          <div className="panel__heading">
            <span>Recommendation history</span>
            <strong>{recommendationData.length} entries</strong>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={recommendationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#0c8f7a" strokeWidth={2} />
              <Line type="monotone" dataKey="confidence" stroke="#d69500" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-panel">
          <div className="panel__heading">
            <span>Calibration metric summary</span>
            <strong>{calibrationData.length} entries</strong>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={calibrationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="drift" stroke="#e05d3f" strokeWidth={2} />
              <Line type="monotone" dataKey="tracking" stroke="#0c8f7a" strokeWidth={2} />
              <Line type="monotone" dataKey="ads" stroke="#7b61ff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <span>Confidence trend</span>
            <strong>{visibleRecommendations[0]?.confidenceScore ?? 0}% latest</strong>
          </div>
          <div className="metric-row">
            {visibleRecommendations.slice(0, 4).map((recommendation) => (
              <MetricBadge
                key={recommendation.id}
                label={recommendation.settingName}
                value={`${recommendation.confidenceScore}%`}
                tone={recommendation.confidenceScore >= 70 ? "good" : "warn"}
              />
            ))}
          </div>
        </section>
      </div>

      {visibleRecommendations.length ? (
        <section className="recommendation-list">
          {visibleRecommendations.slice(0, 3).map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </section>
      ) : (
        <section className="notice-panel">
          No recommendations yet. Save Calibration Lab metrics first, then add
          gameplay session input and optional post-game stats.
        </section>
      )}
    </main>
  );
}
