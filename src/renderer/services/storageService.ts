import Dexie, { type Table } from "dexie";
import type {
  CalibrationMetrics,
  CurrentSettings,
  InputSample,
  PostGameStats,
  Recommendation,
  ScreenAnalysisSummary,
  ScreenCaptureSession,
  ScreenFrameMetric,
  Session
} from "../types";

export const storageSchemaVersion = 2;

class AimTuneDatabase extends Dexie {
  sessions!: Table<Session, string>;
  inputSamples!: Table<InputSample, string>;
  settings!: Table<CurrentSettings, string>;
  calibrationMetrics!: Table<CalibrationMetrics, string>;
  postGameStats!: Table<PostGameStats, string>;
  recommendations!: Table<Recommendation, string>;
  screenCaptureSessions!: Table<ScreenCaptureSession, string>;
  screenFrameMetrics!: Table<ScreenFrameMetric, string>;
  screenAnalysisSummaries!: Table<ScreenAnalysisSummary, string>;

  constructor() {
    super("aimtune-ai");
    this.version(1).stores({
      sessions: "id, mode, platform, gameName, startedAt, endedAt",
      inputSamples: "id, sessionId, timestamp",
      settings: "id, sessionId, gameName, platform",
      calibrationMetrics: "id, sessionId",
      postGameStats: "id, sessionId",
      recommendations: "id, sessionId, settingName, confidenceScore"
    });
    this.version(storageSchemaVersion).stores({
      sessions: "id, mode, platform, gameName, startedAt, endedAt",
      inputSamples: "id, sessionId, timestamp",
      settings: "id, sessionId, gameName, platform",
      calibrationMetrics: "id, sessionId",
      postGameStats: "id, sessionId",
      recommendations: "id, sessionId, settingName, confidenceScore",
      screenCaptureSessions: "id, mode, gameName, sourceName, startedAt, endedAt, status",
      screenFrameMetrics: "id, sessionId, timestamp",
      screenAnalysisSummaries: "id, sessionId, sampleCount"
    });
  }
}

export const db = new AimTuneDatabase();

export const storageService = {
  async saveSession(session: Session) {
    await db.sessions.put(session);
    return session;
  },
  async listSessions() {
    return db.sessions.orderBy("startedAt").reverse().toArray();
  },
  async getSession(id: string) {
    return db.sessions.get(id);
  },
  async saveSettings(settings: CurrentSettings) {
    await db.settings.put(settings);
    return settings;
  },
  async getLatestSettings() {
    return db.settings.orderBy("id").last();
  },
  async listSettings() {
    return db.settings.toArray();
  },
  async saveInputSamples(samples: InputSample[]) {
    if (samples.length) await db.inputSamples.bulkPut(samples);
    return samples;
  },
  async listInputSamples(sessionId: string) {
    return db.inputSamples.where("sessionId").equals(sessionId).toArray();
  },
  async saveCalibrationMetrics(metrics: CalibrationMetrics) {
    await db.calibrationMetrics.put(metrics);
    return metrics;
  },
  async getLatestCalibrationMetrics() {
    return db.calibrationMetrics.orderBy("id").last();
  },
  async listCalibrationMetrics() {
    return db.calibrationMetrics.toArray();
  },
  async savePostGameStats(stats: PostGameStats) {
    await db.postGameStats.put(stats);
    return stats;
  },
  async listPostGameStats() {
    return db.postGameStats.toArray();
  },
  async saveRecommendations(recommendations: Recommendation[]) {
    if (recommendations.length) await db.recommendations.bulkPut(recommendations);
    return recommendations;
  },
  async listRecommendations() {
    return db.recommendations.orderBy("id").reverse().toArray();
  },
  async saveScreenCaptureSession(session: ScreenCaptureSession) {
    await db.screenCaptureSessions.put(session);
    return session;
  },
  async listScreenCaptureSessions() {
    return db.screenCaptureSessions.orderBy("startedAt").reverse().toArray();
  },
  async saveScreenFrameMetrics(metrics: ScreenFrameMetric[]) {
    if (metrics.length) await db.screenFrameMetrics.bulkPut(metrics);
    return metrics;
  },
  async listScreenFrameMetrics(sessionId?: string) {
    if (sessionId) {
      return db.screenFrameMetrics.where("sessionId").equals(sessionId).toArray();
    }
    return db.screenFrameMetrics.orderBy("timestamp").toArray();
  },
  async saveScreenAnalysisSummary(summary: ScreenAnalysisSummary) {
    await db.screenAnalysisSummaries.put(summary);
    return summary;
  },
  async getLatestScreenAnalysisSummary() {
    return db.screenAnalysisSummaries.orderBy("id").last();
  },
  async listScreenAnalysisSummaries() {
    return db.screenAnalysisSummaries.orderBy("id").toArray();
  },
  async clearAllData() {
    await db.transaction(
      "rw",
      [
        db.sessions,
        db.inputSamples,
        db.settings,
        db.calibrationMetrics,
        db.postGameStats,
        db.recommendations,
        db.screenCaptureSessions,
        db.screenFrameMetrics,
        db.screenAnalysisSummaries
      ],
      async () => {
        await Promise.all([
          db.sessions.clear(),
          db.inputSamples.clear(),
          db.settings.clear(),
          db.calibrationMetrics.clear(),
          db.postGameStats.clear(),
          db.recommendations.clear(),
          db.screenCaptureSessions.clear(),
          db.screenFrameMetrics.clear(),
          db.screenAnalysisSummaries.clear()
        ]);
      }
    );
  }
};
