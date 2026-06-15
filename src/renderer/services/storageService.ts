import Dexie, { type Table } from "dexie";
import type {
  CalibrationMetrics,
  CurrentSettings,
  InputSample,
  PostGameStats,
  Recommendation,
  Session
} from "../types";

class AimTuneDatabase extends Dexie {
  sessions!: Table<Session, string>;
  inputSamples!: Table<InputSample, string>;
  settings!: Table<CurrentSettings, string>;
  calibrationMetrics!: Table<CalibrationMetrics, string>;
  postGameStats!: Table<PostGameStats, string>;
  recommendations!: Table<Recommendation, string>;

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
  async clearAllData() {
    await db.transaction(
      "rw",
      [
        db.sessions,
        db.inputSamples,
        db.settings,
        db.calibrationMetrics,
        db.postGameStats,
        db.recommendations
      ],
      async () => {
        await Promise.all([
          db.sessions.clear(),
          db.inputSamples.clear(),
          db.settings.clear(),
          db.calibrationMetrics.clear(),
          db.postGameStats.clear(),
          db.recommendations.clear()
        ]);
      }
    );
  }
};
