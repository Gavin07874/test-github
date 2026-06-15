import { useEffect, useMemo, useState } from "react";
import { isSupportedGame } from "../services/gameProfiles";
import { generateRecommendations } from "../services/precisionOptimizer";
import { storageService } from "../services/storageService";
import type {
  AppMode,
  CalibrationMetrics,
  CurrentSettings,
  Recommendation,
  ScreenAnalysisSummary,
  ScreenCaptureSession,
  ScreenFrameMetric,
  Session
} from "../types";

export type PageId =
  | "home"
  | "mode"
  | "controller"
  | "settings"
  | "calibration"
  | "capture"
  | "report"
  | "dashboard";

export const flowPages: Array<{ id: PageId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "mode", label: "Mode" },
  { id: "controller", label: "Controller" },
  { id: "settings", label: "Settings" },
  { id: "calibration", label: "Calibration" },
  { id: "capture", label: "Capture" },
  { id: "report", label: "Report" },
  { id: "dashboard", label: "Dashboard" }
];

function latestTelemetrySession(sessions: Session[]) {
  return sessions.find(
    (session) => session.mode === "pc" || session.mode === "console_remote_play"
  );
}

export function useAimTuneFlow() {
  const [page, setPage] = useState<PageId>("home");
  const [mode, setMode] = useState<AppMode | undefined>();
  const [settings, setSettings] = useState<CurrentSettings | undefined>();
  const [calibrationMetrics, setCalibrationMetrics] =
    useState<CalibrationMetrics | undefined>();
  const [session, setSession] = useState<Session | undefined>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [screenAnalysisSummary, setScreenAnalysisSummary] =
    useState<ScreenAnalysisSummary | undefined>();

  useEffect(() => {
    async function loadInitialData() {
      const [
        loadedSessions,
        latestSettings,
        latestMetrics,
        loadedRecommendations,
        latestScreenSummary
      ] = await Promise.all([
        storageService.listSessions(),
        storageService.getLatestSettings(),
        storageService.getLatestCalibrationMetrics(),
        storageService.listRecommendations(),
        storageService.getLatestScreenAnalysisSummary()
      ]);

      const latestSession = latestTelemetrySession(loadedSessions);
      setSessions(loadedSessions);
      setSession(latestSession);

      if (latestSession) setMode(latestSession.mode);
      if (latestSettings && isSupportedGame(latestSettings.gameName)) {
        setSettings(latestSettings);
      }
      if (latestMetrics) setCalibrationMetrics(latestMetrics);
      if (latestScreenSummary) setScreenAnalysisSummary(latestScreenSummary);
      setRecommendations(latestMetrics ? loadedRecommendations.slice(0, 6) : []);
    }

    void loadInitialData();
  }, []);

  const selectedLabel = useMemo(() => {
    if (!mode) return "No mode selected";
    return mode === "pc" ? "PC Mode" : "Console Remote Play";
  }, [mode]);

  function canVisitPage(pageId: PageId) {
    if (pageId === "home" || pageId === "mode" || pageId === "dashboard") return true;
    if (pageId === "controller" || pageId === "settings") return Boolean(mode);
    if (pageId === "calibration") return Boolean(mode && settings);
    if (pageId === "capture") return Boolean(mode && settings && calibrationMetrics);
    if (pageId === "report") return Boolean(calibrationMetrics);
    return false;
  }

  function visitPage(pageId: PageId) {
    if (canVisitPage(pageId)) setPage(pageId);
  }

  function chooseMode(nextMode: AppMode) {
    setMode(nextMode);
    setPage("controller");
  }

  async function saveSettings(nextSettings: CurrentSettings) {
    await storageService.saveSettings(nextSettings);
    setSettings(nextSettings);
    setCalibrationMetrics(undefined);
    setScreenAnalysisSummary(undefined);
    setRecommendations([]);
    setPage("calibration");
  }

  async function saveGeneratedRecommendations(
    nextMetrics: CalibrationMetrics,
    nextScreenSummary?: ScreenAnalysisSummary
  ) {
    if (!settings || !mode) {
      setRecommendations([]);
      return [];
    }

    const generated = generateRecommendations({
      mode,
      settings: {
        ...settings,
        sessionId: nextMetrics.sessionId
      },
      calibrationMetrics: nextMetrics,
      screenAnalysisSummary: nextScreenSummary,
      sessions
    });

    await storageService.saveRecommendations(generated);
    setRecommendations(generated);
    return generated;
  }

  async function saveCalibration(nextMetrics: CalibrationMetrics) {
    await storageService.saveCalibrationMetrics(nextMetrics);
    setCalibrationMetrics(nextMetrics);
    setScreenAnalysisSummary(undefined);
    setRecommendations([]);
    setPage("capture");
  }

  async function saveScreenCapture(
    captureSession: ScreenCaptureSession,
    frameMetrics: ScreenFrameMetric[],
    summary: ScreenAnalysisSummary
  ) {
    await Promise.all([
      storageService.saveScreenCaptureSession(captureSession),
      storageService.saveScreenFrameMetrics(frameMetrics),
      storageService.saveScreenAnalysisSummary(summary)
    ]);
    setScreenAnalysisSummary(summary);

    if (calibrationMetrics) {
      await saveGeneratedRecommendations(calibrationMetrics, summary);
    }
    setPage("report");
  }

  async function skipScreenCapture() {
    if (calibrationMetrics) {
      await saveGeneratedRecommendations(calibrationMetrics, screenAnalysisSummary);
    }
    setPage("report");
  }

  async function clearLocalData() {
    await storageService.clearAllData();
    setMode(undefined);
    setSettings(undefined);
    setCalibrationMetrics(undefined);
    setScreenAnalysisSummary(undefined);
    setSession(undefined);
    setRecommendations([]);
    setSessions([]);
    setPage("home");
  }

  return {
    page,
    mode,
    settings,
    calibrationMetrics,
    screenAnalysisSummary,
    session,
    recommendations,
    selectedLabel,
    canVisitPage,
    visitPage,
    chooseMode,
    saveSettings,
    saveCalibration,
    saveScreenCapture,
    skipScreenCapture,
    clearLocalData
  };
}
