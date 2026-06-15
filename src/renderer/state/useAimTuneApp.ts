import { useEffect, useMemo, useState } from "react";
import { cloneDefaults, getGameProfile } from "../data/gameProfiles";
import { generateRecommendations } from "../services/recommendationEngine";
import { storageService } from "../services/storageService";
import type {
  AnalysisSummary,
  AppMode,
  AppSetup,
  AppStep,
  CalibrationMetric,
  CaptureSession,
  GameId,
  PostGameStats,
  Recommendation,
  SettingsMirror,
  VisionDetection,
  VisionFrameMetric
} from "../types";

export const stepOrder: Array<{ id: AppStep; label: string }> = [
  { id: "home", label: "Home" },
  { id: "setup", label: "Setup" },
  { id: "controller", label: "Controller" },
  { id: "settings", label: "Settings" },
  { id: "calibration", label: "Calibration" },
  { id: "capture", label: "Capture" },
  { id: "report", label: "Report" },
  { id: "dashboard", label: "Dashboard" }
];

export function useAimTuneApp() {
  const [step, setStep] = useState<AppStep>("home");
  const [setup, setSetup] = useState<AppSetup | undefined>();
  const [settings, setSettings] = useState<SettingsMirror | undefined>();
  const [calibration, setCalibration] = useState<CalibrationMetric | undefined>();
  const [analysis, setAnalysis] = useState<AnalysisSummary | undefined>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [postGameStats, setPostGameStats] = useState<PostGameStats[]>([]);

  useEffect(() => {
    async function load() {
      const [savedSetup, savedCalibration, savedAnalysis, savedRecommendations, savedStats] =
        await Promise.all([
          storageService.getSetup(),
          storageService.latestCalibrationMetric(),
          storageService.latestAnalysisSummary(),
          storageService.listRecommendations(),
          storageService.listPostGameStats()
        ]);
      if (savedSetup) {
        setSetup(savedSetup.setup);
        setSettings(savedSetup.settings);
      }
      setCalibration(savedCalibration);
      setAnalysis(savedAnalysis);
      setRecommendations(savedCalibration ? savedRecommendations : []);
      setPostGameStats(savedStats);
    }
    void load();
  }, []);

  const profile = useMemo(
    () => getGameProfile(setup?.gameId ?? "fortnite"),
    [setup?.gameId]
  );

  function canVisit(nextStep: AppStep) {
    if (nextStep === "home" || nextStep === "setup" || nextStep === "dashboard") return true;
    if (nextStep === "controller" || nextStep === "settings") return Boolean(setup);
    if (nextStep === "calibration") return Boolean(setup && settings);
    if (nextStep === "capture" || nextStep === "report") return Boolean(calibration);
    return false;
  }

  function visit(nextStep: AppStep) {
    if (canVisit(nextStep)) setStep(nextStep);
  }

  async function saveSetup(gameId: GameId, mode: AppMode) {
    const nextSetup = { gameId, mode };
    const nextSettings = cloneDefaults(gameId);
    await storageService.saveSetup(nextSetup, nextSettings);
    setSetup(nextSetup);
    setSettings(nextSettings);
    setCalibration(undefined);
    setAnalysis(undefined);
    setRecommendations([]);
    setStep("controller");
  }

  async function saveSettings(nextSettings: SettingsMirror) {
    if (!setup) return;
    await storageService.saveSetup(setup, nextSettings);
    setSettings(nextSettings);
    setCalibration(undefined);
    setAnalysis(undefined);
    setRecommendations([]);
    setStep("calibration");
  }

  async function saveCalibration(metric: CalibrationMetric) {
    await storageService.saveCalibrationMetric(metric);
    setCalibration(metric);
    setAnalysis(undefined);
    setRecommendations([]);
    setStep("capture");
  }

  async function completeCapture(
    session: CaptureSession,
    metrics: VisionFrameMetric[],
    detections: VisionDetection[],
    summary: AnalysisSummary
  ) {
    await Promise.all([
      storageService.saveCaptureSession(session),
      storageService.saveVisionMetrics(metrics),
      storageService.saveVisionDetections(detections),
      storageService.saveAnalysisSummary(summary)
    ]);
    setAnalysis(summary);
    await buildRecommendations(summary);
    setStep("report");
  }

  async function buildRecommendations(nextAnalysis = analysis) {
    if (!setup || !settings || !calibration) {
      setRecommendations([]);
      return [];
    }
    const generated = generateRecommendations({
      gameId: setup.gameId,
      mode: setup.mode,
      settings,
      calibration,
      analysis: nextAnalysis,
      postGameStats
    });
    await storageService.saveRecommendations(generated);
    setRecommendations(generated);
    return generated;
  }

  async function skipCapture() {
    await buildRecommendations(undefined);
    setStep("report");
  }

  async function savePostGameStats(stats: PostGameStats) {
    await storageService.savePostGameStats(stats);
    const nextStats = [stats, ...postGameStats];
    setPostGameStats(nextStats);
  }

  async function resetLocalData() {
    await storageService.clearAll();
    setStep("home");
    setSetup(undefined);
    setSettings(undefined);
    setCalibration(undefined);
    setAnalysis(undefined);
    setRecommendations([]);
    setPostGameStats([]);
  }

  return {
    step,
    setup,
    profile,
    settings,
    calibration,
    analysis,
    recommendations,
    postGameStats,
    canVisit,
    visit,
    saveSetup,
    saveSettings,
    saveCalibration,
    completeCapture,
    skipCapture,
    savePostGameStats,
    resetLocalData
  };
}
