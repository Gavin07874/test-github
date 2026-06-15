import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { WorkflowProgress } from "./components/WorkflowProgress";
import { CalibrationLab } from "./pages/CalibrationLab";
import { ControllerTest } from "./pages/ControllerTest";
import { Home } from "./pages/Home";
import { ModeSelect } from "./pages/ModeSelect";
import { NewSession } from "./pages/NewSession";
import { PostGameStats } from "./pages/PostGameStats";
import { RecommendationReport } from "./pages/RecommendationReport";
import { SettingsSetup } from "./pages/SettingsSetup";
import { generateRecommendations } from "./services/precisionOptimizer";
import { isSupportedGame } from "./services/gameProfiles";
import { storageService } from "./services/storageService";
import type {
  AppMode,
  CalibrationMetrics,
  CurrentSettings,
  InputSample,
  PostGameStats as PostGameStatsModel,
  Recommendation,
  Session
} from "./types";

type PageId =
  | "home"
  | "mode"
  | "controller"
  | "settings"
  | "calibration"
  | "session"
  | "postgame"
  | "report"
  | "dashboard";

const pageLabels: Array<{ id: PageId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "mode", label: "Mode" },
  { id: "controller", label: "Controller" },
  { id: "settings", label: "Settings" },
  { id: "calibration", label: "Calibration" },
  { id: "session", label: "Session" },
  { id: "postgame", label: "Stats" },
  { id: "report", label: "Report" },
  { id: "dashboard", label: "Dashboard" }
];

export function App() {
  const [page, setPage] = useState<PageId>("home");
  const [mode, setMode] = useState<AppMode | undefined>();
  const [settings, setSettings] = useState<CurrentSettings | undefined>();
  const [calibrationMetrics, setCalibrationMetrics] =
    useState<CalibrationMetrics | undefined>();
  const [session, setSession] = useState<Session | undefined>();
  const [postGameStats, setPostGameStats] = useState<PostGameStatsModel | undefined>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      const [loadedSessions, latestSettings, latestMetrics, loadedRecommendations] =
        await Promise.all([
          storageService.listSessions(),
          storageService.getLatestSettings(),
          storageService.getLatestCalibrationMetrics(),
          storageService.listRecommendations()
        ]);
      setSessions(loadedSessions);
      const latestSupportedSession = loadedSessions.find(
        (loadedSession) =>
          loadedSession.mode === "pc" ||
          loadedSession.mode === "console_remote_play"
      );
      if (latestSupportedSession) {
        setSession(latestSupportedSession);
        setMode(latestSupportedSession.mode);
      }
      if (latestSettings && isSupportedGame(latestSettings.gameName)) {
        setSettings(latestSettings);
      }
      if (latestMetrics) setCalibrationMetrics(latestMetrics);
      setRecommendations(latestMetrics ? loadedRecommendations.slice(0, 6) : []);
    }
    void loadInitialData();
  }, []);

  const selectedLabel = useMemo(() => {
    if (!mode) return "No mode selected";
    if (mode === "pc") return "PC Mode";
    return "Console Remote Play";
  }, [mode]);

  function canVisitPage(pageId: PageId) {
    if (["home", "mode", "dashboard"].includes(pageId)) return true;
    if (pageId === "controller" || pageId === "settings") return Boolean(mode);
    if (pageId === "calibration" || pageId === "session") {
      return Boolean(mode && settings);
    }
    if (pageId === "postgame") return Boolean(mode && settings && session);
    if (pageId === "report") {
      return Boolean(calibrationMetrics);
    }
    return false;
  }

  async function refreshSessions() {
    setSessions(await storageService.listSessions());
  }

  function chooseMode(nextMode: AppMode) {
    setMode(nextMode);
    setPage("controller");
  }

  async function saveSettings(nextSettings: CurrentSettings) {
    await storageService.saveSettings(nextSettings);
    setSettings(nextSettings);
    setPage("calibration");
  }

  async function saveCalibration(nextMetrics: CalibrationMetrics) {
    await storageService.saveCalibrationMetrics(nextMetrics);
    setCalibrationMetrics(nextMetrics);
    if (!settings || !mode) {
      setPage("report");
      return;
    }

    const generated = generateRecommendations({
      mode,
      settings: {
        ...settings,
        sessionId: nextMetrics.sessionId
      },
      calibrationMetrics: nextMetrics,
      sessions
    });
    await storageService.saveRecommendations(generated);
    setRecommendations(generated);
    setPage("report");
  }

  async function saveSession(nextSession: Session, _samples: InputSample[]) {
    setSession(nextSession);
    await refreshSessions();
  }

  async function savePostGame(nextStats: PostGameStatsModel) {
    setPostGameStats(nextStats);
    await storageService.savePostGameStats(nextStats);

    if (!settings || !mode || !calibrationMetrics) {
      setRecommendations([]);
      setPage("report");
      return;
    }

    const generated = generateRecommendations({
      mode,
      settings: {
        ...settings,
        sessionId: nextStats.sessionId
      },
      calibrationMetrics,
      postGameStats: nextStats,
      sessions
    });
    await storageService.saveRecommendations(generated);
    setRecommendations(generated);
    setPage("report");
  }

  function renderPage() {
    if (page === "home") {
      return (
        <Home
          onStart={() => setPage("mode")}
          onDashboard={() => setPage("dashboard")}
        />
      );
    }
    if (page === "mode") {
      return <ModeSelect selectedMode={mode} onSelect={chooseMode} />;
    }
    if (page === "controller") {
      return <ControllerTest mode={mode} onContinue={() => setPage("settings")} />;
    }
    if (page === "settings") {
      return (
        <SettingsSetup mode={mode} currentSettings={settings} onSave={saveSettings} />
      );
    }
    if (page === "calibration") {
      return (
        <CalibrationLab
          mode={mode}
          settings={settings}
          metrics={calibrationMetrics}
          onSave={saveCalibration}
        />
      );
    }
    if (page === "session") {
      return (
        <NewSession
          mode={mode}
          settings={settings}
          session={session}
          onSessionSaved={saveSession}
          onContinue={() => setPage("postgame")}
        />
      );
    }
    if (page === "postgame") {
      return (
        <PostGameStats
          session={session}
          settings={settings}
          onSave={savePostGame}
        />
      );
    }
    if (page === "report") {
      return (
        <RecommendationReport
          recommendations={recommendations}
          onDashboard={() => setPage("dashboard")}
        />
      );
    }
    return <Dashboard />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span>AimTune</span>
          <strong>AI</strong>
        </div>
        <div className="mode-chip">{selectedLabel}</div>
        <nav className="nav-list" aria-label="App pages">
          {pageLabels.map((item) => (
            <button
              className={page === item.id ? "is-active" : ""}
              disabled={!canVisitPage(item.id)}
              key={item.id}
              onClick={() => {
                if (canVisitPage(item.id)) setPage(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="safety-note">
          Calibration and controller telemetry only. No game memory, input
          automation, macros, recoil scripts, or anti-cheat bypasses.
        </div>
      </aside>
      <div
        className={`content-shell ${page === "calibration" ? "content-shell--calibration" : ""}`}
      >
        <WorkflowProgress
          mode={mode}
          settings={settings}
          calibrationMetrics={calibrationMetrics}
          session={session}
          recommendations={recommendations}
        />
        {renderPage()}
      </div>
    </div>
  );
}
