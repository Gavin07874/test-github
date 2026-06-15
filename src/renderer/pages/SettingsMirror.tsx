import { useState } from "react";
import { getGameProfile, clampToStep } from "../data/gameProfiles";
import type { GameId, SettingsMirror } from "../types";

interface SettingsMirrorProps {
  gameId: GameId;
  settings: SettingsMirror;
  onSave: (settings: SettingsMirror) => void | Promise<void>;
}

export function SettingsMirrorPage({ gameId, settings, onSave }: SettingsMirrorProps) {
  const profile = getGameProfile(gameId);
  const [draft, setDraft] = useState(settings);

  function update(key: keyof SettingsMirror, value: number | string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="page">
      <div className={`settings-hero settings-hero--${profile.theme}`}>
        <div>
          <span className="eyebrow">Step 3</span>
          <h2>Settings mirror</h2>
          <p>Copy the current controller values from {profile.settingPath}.</p>
        </div>
        <strong>{profile.name}</strong>
      </div>
      <section className={`settings-console settings-console--${profile.theme}`}>
        {profile.theme === "tlou2" ? (
          <div className="tlou-tabs">
            <span>OPTIONS</span>
            <strong>CONTROLS</strong>
          </div>
        ) : null}
        {Object.entries(
          profile.settings.reduce<Record<string, typeof profile.settings>>((groups, setting) => {
            groups[setting.section] = [...(groups[setting.section] ?? []), setting];
            return groups;
          }, {})
        ).map(([section, fields]) => (
          <section className="settings-section" key={section}>
            <h3>{section}</h3>
            {fields.map((field) => {
              const value = draft[field.key];
              return (
                <label className="tune-field" key={field.key}>
                  <span>
                    <strong>{field.label}</strong>
                    <small>{field.hint}</small>
                  </span>
                  <div className="range-control">
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={Number(value)}
                      onChange={(event) =>
                        update(
                          field.key,
                          clampToStep(Number(event.target.value), field.min, field.max, field.step)
                        )
                      }
                    />
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={Number(value)}
                      onChange={(event) =>
                        update(
                          field.key,
                          clampToStep(Number(event.target.value), field.min, field.max, field.step)
                        )
                      }
                    />
                  </div>
                  <em>{field.min}-{field.max} / step {field.step}</em>
                </label>
              );
            })}
          </section>
        ))}
        {profile.theme === "tlou2" ? (
          <button
            className={`toggle-row ${draft.weaponSwapInvert ? "is-on" : ""}`}
            onClick={() => update("weaponSwapInvert", !draft.weaponSwapInvert)}
          >
            <span>Weapon Swap Invert</span>
            <strong>{draft.weaponSwapInvert ? "On" : "Off"}</strong>
          </button>
        ) : null}
        <label className="tune-field">
          <span>
            <strong>{profile.theme === "fortnite" ? "Look Input Curve" : "Aim Response"}</strong>
            <small>Used by the recommendation engine for game-specific rounding.</small>
          </span>
          <select value={draft.responseCurve} onChange={(event) => update("responseCurve", event.target.value)}>
            {profile.responseCurves.map((curve) => (
              <option key={curve}>{curve}</option>
            ))}
          </select>
        </label>
        <div className="footer-actions">
          <button className="button" onClick={() => onSave(draft)}>
            Save and calibrate
          </button>
        </div>
      </section>
    </main>
  );
}
