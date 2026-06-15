import { Dashboard } from "./pages/Dashboard";
import { WorkflowProgress } from "./components/WorkflowProgress";
import { CalibrationLab } from "./pages/CalibrationLab";
import { ControllerTest } from "./pages/ControllerTest";
import { Home } from "./pages/Home";
import { ModeSelect } from "./pages/ModeSelect";
import { RecommendationReport } from "./pages/RecommendationReport";
import { SettingsSetup } from "./pages/SettingsSetup";
import { flowPages, useAimTuneFlow } from "./state/useAimTuneFlow";

export function App() {
  const flow = useAimTuneFlow();

  function renderPage() {
    if (flow.page === "home") {
      return (
        <Home
          onStart={() => flow.visitPage("mode")}
          onDashboard={() => flow.visitPage("dashboard")}
        />
      );
    }
    if (flow.page === "mode") {
      return <ModeSelect selectedMode={flow.mode} onSelect={flow.chooseMode} />;
    }
    if (flow.page === "controller") {
      return (
        <ControllerTest
          mode={flow.mode}
          onContinue={() => flow.visitPage("settings")}
        />
      );
    }
    if (flow.page === "settings") {
      return (
        <SettingsSetup
          mode={flow.mode}
          currentSettings={flow.settings}
          onSave={flow.saveSettings}
        />
      );
    }
    if (flow.page === "calibration") {
      return (
        <CalibrationLab
          mode={flow.mode}
          settings={flow.settings}
          metrics={flow.calibrationMetrics}
          onSave={flow.saveCalibration}
        />
      );
    }
    if (flow.page === "report") {
      return (
        <RecommendationReport
          recommendations={flow.recommendations}
          onDashboard={() => flow.visitPage("dashboard")}
        />
      );
    }
    return <Dashboard onResetData={flow.clearLocalData} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span>AimTune</span>
          <strong>AI</strong>
        </div>
        <div className="mode-chip">{flow.selectedLabel}</div>
        <nav className="nav-list" aria-label="App pages">
          {flowPages.map((item) => (
            <button
              className={flow.page === item.id ? "is-active" : ""}
              disabled={!flow.canVisitPage(item.id)}
              key={item.id}
              onClick={() => flow.visitPage(item.id)}
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
        className={`content-shell ${flow.page === "calibration" ? "content-shell--calibration" : ""}`}
      >
        <WorkflowProgress
          mode={flow.mode}
          settings={flow.settings}
          calibrationMetrics={flow.calibrationMetrics}
          recommendations={flow.recommendations}
        />
        {renderPage()}
      </div>
    </div>
  );
}
