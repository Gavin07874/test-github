import Dexie, { type Table } from "dexie";
import type {
  AnalysisSummary,
  AppSetup,
  CalibrationMetric,
  CalibrationRun,
  CaptureSession,
  ControllerSample,
  LocalExportSnapshot,
  PostGameStats,
  Recommendation,
  SettingsMirror,
  VisionDetection,
  VisionFrameMetric
} from "../types";

export const storageSchemaVersion = 1;

interface StoredSettings {
  id: string;
  setup: AppSetup;
  settings: SettingsMirror;
  updatedAt: string;
}

class AimTuneDatabase extends Dexie {
  setup!: Table<StoredSettings, string>;
  controllerSamples!: Table<ControllerSample, string>;
  calibrationRuns!: Table<CalibrationRun, string>;
  calibrationMetrics!: Table<CalibrationMetric, string>;
  captureSessions!: Table<CaptureSession, string>;
  visionFrameMetrics!: Table<VisionFrameMetric, string>;
  visionDetections!: Table<VisionDetection, string>;
  analysisSummaries!: Table<AnalysisSummary, string>;
  recommendations!: Table<Recommendation, string>;
  postGameStats!: Table<PostGameStats, string>;

  constructor() {
    super("aimtune-square-one");
    this.version(storageSchemaVersion).stores({
      setup: "id, updatedAt",
      controllerSamples: "id, sessionId, timestamp",
      calibrationRuns: "id, gameId, mode, startedAt, status",
      calibrationMetrics: "id, runId, gameId, createdAt",
      captureSessions: "id, gameId, mode, sourceName, startedAt, status",
      visionFrameMetrics: "id, captureSessionId, timestamp",
      visionDetections: "id, captureSessionId, timestamp, label, score",
      analysisSummaries: "id, captureSessionId, sampleCount, modelStatus",
      recommendations: "id, gameId, settingKey, confidence, severity",
      postGameStats: "id, gameId, createdAt"
    });
  }
}

export const db = new AimTuneDatabase();

export const storageService = {
  async saveSetup(setup: AppSetup, settings: SettingsMirror) {
    const record: StoredSettings = {
      id: "current",
      setup,
      settings,
      updatedAt: new Date().toISOString()
    };
    await db.setup.put(record);
    return record;
  },
  async getSetup() {
    return db.setup.get("current");
  },
  async saveControllerSamples(samples: ControllerSample[]) {
    if (samples.length) await db.controllerSamples.bulkPut(samples);
    return samples;
  },
  async saveCalibrationRun(run: CalibrationRun) {
    await db.calibrationRuns.put(run);
    return run;
  },
  async saveCalibrationMetric(metric: CalibrationMetric) {
    await db.calibrationMetrics.put(metric);
    return metric;
  },
  async latestCalibrationMetric() {
    return db.calibrationMetrics.orderBy("createdAt").last();
  },
  async listCalibrationMetrics() {
    return db.calibrationMetrics.orderBy("createdAt").reverse().toArray();
  },
  async saveCaptureSession(session: CaptureSession) {
    await db.captureSessions.put(session);
    return session;
  },
  async listCaptureSessions() {
    return db.captureSessions.orderBy("startedAt").reverse().toArray();
  },
  async saveVisionMetrics(metrics: VisionFrameMetric[]) {
    if (metrics.length) await db.visionFrameMetrics.bulkPut(metrics);
    return metrics;
  },
  async listVisionMetrics() {
    return db.visionFrameMetrics.orderBy("timestamp").toArray();
  },
  async saveVisionDetections(detections: VisionDetection[]) {
    if (detections.length) await db.visionDetections.bulkPut(detections);
    return detections;
  },
  async listVisionDetections() {
    return db.visionDetections.orderBy("timestamp").toArray();
  },
  async saveAnalysisSummary(summary: AnalysisSummary) {
    await db.analysisSummaries.put(summary);
    return summary;
  },
  async latestAnalysisSummary() {
    return db.analysisSummaries.orderBy("id").last();
  },
  async listAnalysisSummaries() {
    return db.analysisSummaries.orderBy("id").toArray();
  },
  async saveRecommendations(recommendations: Recommendation[]) {
    await db.recommendations.clear();
    if (recommendations.length) await db.recommendations.bulkPut(recommendations);
    return recommendations;
  },
  async listRecommendations() {
    return db.recommendations.orderBy("confidence").reverse().toArray();
  },
  async savePostGameStats(stats: PostGameStats) {
    await db.postGameStats.put(stats);
    return stats;
  },
  async listPostGameStats() {
    return db.postGameStats.orderBy("createdAt").reverse().toArray();
  },
  async exportSnapshot(): Promise<LocalExportSnapshot> {
    const current = await db.setup.get("current");
    return {
      exportedAt: new Date().toISOString(),
      setup: current?.setup,
      settings: current?.settings,
      calibrationMetrics: await db.calibrationMetrics.toArray(),
      captureSessions: await db.captureSessions.toArray(),
      visionFrameMetrics: await db.visionFrameMetrics.toArray(),
      visionDetections: await db.visionDetections.toArray(),
      analysisSummaries: await db.analysisSummaries.toArray(),
      recommendations: await db.recommendations.toArray(),
      postGameStats: await db.postGameStats.toArray(),
      safetyBoundary:
        "Metrics and summaries only. No screenshots, clips, raw frames, audio, game files, game memory, or automation."
    };
  },
  async clearAll() {
    await db.transaction(
      "rw",
      [
        db.setup,
        db.controllerSamples,
        db.calibrationRuns,
        db.calibrationMetrics,
        db.captureSessions,
        db.visionFrameMetrics,
        db.visionDetections,
        db.analysisSummaries,
        db.recommendations,
        db.postGameStats
      ],
      async () => {
        await Promise.all([
          db.setup.clear(),
          db.controllerSamples.clear(),
          db.calibrationRuns.clear(),
          db.calibrationMetrics.clear(),
          db.captureSessions.clear(),
          db.visionFrameMetrics.clear(),
          db.visionDetections.clear(),
          db.analysisSummaries.clear(),
          db.recommendations.clear(),
          db.postGameStats.clear()
        ]);
      }
    );
  }
};

export const storageSafetyPolicy = {
  storesFrames: false,
  storesScreenshots: false,
  storesClips: false,
  storesAudio: false
} as const;
