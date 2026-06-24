import { gameProfiles } from "../data/gameProfiles";
import { useState } from "react";
import type { AppMode, GameId } from "../types";

interface SetupPageProps {
  gameId?: GameId;
  mode?: AppMode;
  onSave: (gameId: GameId, mode: AppMode) => void | Promise<void>;
}

export function SetupPage({ gameId = "fortnite", mode = "pc", onSave }: SetupPageProps) {
  const [selectedGame, setSelectedGame] = useState<GameId>(gameId);
  const [selectedMode, setSelectedMode] = useState<AppMode>(mode);

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 1</span>
        <h2>Game + mode setup</h2>
        <p>Pick the test game and how the controller is connected to this computer.</p>
      </div>
      <section className="setup-grid">
        <div className="panel">
          <div className="panel-heading">
            <span>Game</span>
            <strong>Only v1 supported games</strong>
          </div>
          <div className="card-list">
            {gameProfiles.map((profile) => (
              <button
                className={`choice-card ${profile.id === selectedGame ? "is-selected" : ""}`}
                key={profile.id}
                onClick={() => setSelectedGame(profile.id)}
              >
                <span>{profile.shortName}</span>
                <strong>{profile.description}</strong>
                <small>{profile.settingPath}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <span>Mode</span>
            <strong>Telemetry source</strong>
          </div>
          <div className="card-list">
            <button
              className={`choice-card ${selectedMode === "pc" ? "is-selected" : ""}`}
              onClick={() => setSelectedMode("pc")}
            >
              <span>PC</span>
              <strong>Controller connected to this computer.</strong>
              <small>Uses Browser Gamepad API only.</small>
            </button>
            <button
              className={`choice-card ${selectedMode === "console_remote_play" ? "is-selected" : ""}`}
              onClick={() => setSelectedMode("console_remote_play")}
            >
              <span>Remote Play</span>
              <strong>Console streamed through Remote Play.</strong>
              <small>Records the controller connected to this computer.</small>
            </button>
          </div>
        </div>
      </section>
      <div className="footer-actions">
        <button className="button" onClick={() => onSave(selectedGame, selectedMode)}>
          Continue to controller test
        </button>
      </div>
    </main>
  );
}
