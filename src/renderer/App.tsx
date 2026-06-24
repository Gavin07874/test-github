import { ProgressRail } from "./components/ProgressRail";
import { CalibrationLab } from "./pages/CalibrationLab";
import { ControllerTest } from "./pages/ControllerTest";
import { Dashboard } from "./pages/Dashboard";
import { GameplayCapture } from "./pages/GameplayCapture";
import { Home } from "./pages/Home";
import { RecommendationReport } from "./pages/RecommendationReport";
import { SettingsMirrorPage } from "./pages/SettingsMirror";
import { SetupPage } from "./pages/SetupPage";
import { useAimTuneApp } from "./state/useAimTuneApp";

export function App() {
  const app = useAimTuneApp();

  function renderStep() {
    if (app.step === "home") {
      return <Home onStart={() => app.visit("setup")} onDashboard={() => app.visit("dashboard")} />;
    }
    if (app.step === "setup") {
      return (
        <SetupPage
          gameId={app.setup?.gameId}
          mode={app.setup?.mode}
          onSave={app.saveSetup}
        />
      );
    }
    if (app.step === "controller") {
      return <ControllerTest mode={app.setup?.mode} onContinue={() => app.visit("settings")} />;
    }
    if (app.step === "settings" && app.setup && app.settings) {
      return (
        <SettingsMirrorPage
          gameId={app.setup.gameId}
          settings={app.settings}
          onSave={app.saveSettings}
        />
      );
    }
    if (app.step === "calibration" && app.setup) {
      return <CalibrationLab gameId={app.setup.gameId} onSave={app.saveCalibration} />;
    }
    if (app.step === "capture" && app.setup && app.settings) {
      return (
        <GameplayCapture
          gameId={app.setup.gameId}
          mode={app.setup.mode}
          settings={app.settings}
          onComplete={(result) =>
            app.completeCapture(
              result.session,
              result.metrics,
              result.detections,
              result.summary
            )
          }
          onSkip={app.skipCapture}
        />
      );
    }
    if (app.step === "report") {
      return (
        <RecommendationReport
          recommendations={app.recommendations}
          analysis={app.analysis}
          onDashboard={() => app.visit("dashboard")}
        />
      );
    }
    return <Dashboard recommendations={app.recommendations} onReset={app.resetLocalData} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>AimTune</span>
          <strong>AI</strong>
        </div>
        <div className="mode-chip">
          {app.setup ? `${app.profile.shortName} / ${app.setup.mode === "pc" ? "PC" : "Remote Play"}` : "No setup"}
        </div>
        <ProgressRail active={app.step} canVisit={app.canVisit} onVisit={app.visit} />
        <div className="safety-note">
          Local-only metrics. No raw frames, audio, game memory, macros, input
          automation, cloud vision, or anti-cheat bypasses.
        </div>
      </aside>
      <section className="content-shell">{renderStep()}</section>
    </div>
  );
}
