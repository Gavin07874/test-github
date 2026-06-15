import { useState } from "react";
import type { CurrentSettings, PostGameStats, Session } from "../types";

interface PostGameStatsProps {
  session?: Session;
  settings?: CurrentSettings;
  onSave: (stats: PostGameStats) => void;
}

export function PostGameStats({ session, settings, onSave }: PostGameStatsProps) {
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [assists, setAssists] = useState("");
  const [accuracyPercent, setAccuracyPercent] = useState("");
  const [headshotPercent, setHeadshotPercent] = useState("");
  const [damage, setDamage] = useState("");
  const [placement, setPlacement] = useState("");
  const [winLoss, setWinLoss] = useState<PostGameStats["winLoss"]>("unknown");
  const [notes, setNotes] = useState("");

  function saveStats() {
    onSave({
      id: crypto.randomUUID(),
      sessionId: session?.id ?? settings?.id ?? crypto.randomUUID(),
      kills,
      deaths,
      assists: assists === "" ? undefined : Number(assists),
      accuracyPercent: accuracyPercent === "" ? undefined : Number(accuracyPercent),
      headshotPercent: headshotPercent === "" ? undefined : Number(headshotPercent),
      damage: damage === "" ? undefined : Number(damage),
      placement: placement || undefined,
      winLoss,
      notes
    });
  }

  return (
    <main className="page">
      <div className="page-heading">
        <span className="eyebrow">Step 6</span>
        <h2>Post-game stats</h2>
        <p>Add performance stats when available. Calibration metrics remain the required evidence for recommendations.</p>
      </div>

      <section className="form-panel">
        <div className="form-grid">
          <label>
            Kills
            <input type="number" min="0" value={kills} onChange={(event) => setKills(Number(event.target.value))} />
          </label>
          <label>
            Deaths
            <input type="number" min="0" value={deaths} onChange={(event) => setDeaths(Number(event.target.value))} />
          </label>
          <label>
            Assists
            <input type="number" min="0" value={assists} onChange={(event) => setAssists(event.target.value)} />
          </label>
          <label>
            Accuracy %
            <input type="number" min="0" max="100" value={accuracyPercent} onChange={(event) => setAccuracyPercent(event.target.value)} />
          </label>
          <label>
            Headshot %
            <input type="number" min="0" max="100" value={headshotPercent} onChange={(event) => setHeadshotPercent(event.target.value)} />
          </label>
          <label>
            Damage
            <input type="number" min="0" value={damage} onChange={(event) => setDamage(event.target.value)} />
          </label>
          <label>
            Placement / rank
            <input value={placement} onChange={(event) => setPlacement(event.target.value)} placeholder="Optional" />
          </label>
          <label>
            Win / loss
            <select value={winLoss} onChange={(event) => setWinLoss(event.target.value as PostGameStats["winLoss"])}>
              <option value="unknown">Unknown</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
            </select>
          </label>
        </div>

        <label className="full-label">
          Notes about how settings felt
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Too fast, too slow, overcorrecting, undershooting, hard to micro-adjust, aim felt delayed, stick drift, hard to track enemies..."
          />
        </label>

        <div className="footer-actions">
          <button className="button" onClick={saveStats}>
            Continue to recommendation report
          </button>
        </div>
      </section>
    </main>
  );
}
