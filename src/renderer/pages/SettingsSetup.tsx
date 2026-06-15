import { useMemo, useState } from "react";
import {
  clampAndRound,
  getGameProfile,
  getSettingBounds,
  isSupportedGame,
  listGameProfiles,
  validateSettings
} from "../services/gameProfiles";
import type { AppMode, CurrentSettings, GameSettingProfile, Platform } from "../types";

interface SettingsSetupProps {
  mode?: AppMode;
  currentSettings?: CurrentSettings;
  onSave: (settings: CurrentSettings) => void;
}

function fitToBounds(
  value: number,
  bounds: { min: number; max: number; step: number }
) {
  return clampAndRound(value, bounds.min, bounds.max, bounds.step);
}

function initialProfile(currentSettings?: CurrentSettings) {
  const profiles = listGameProfiles();
  if (isSupportedGame(currentSettings?.gameName)) {
    return getGameProfile(currentSettings?.gameName ?? profiles[0].gameName);
  }
  return profiles[0];
}

function initialNumber(
  currentSettings: CurrentSettings | undefined,
  profile: GameSettingProfile,
  key:
    | "horizontalSensitivity"
    | "verticalSensitivity"
    | "adsSensitivity"
    | "leftStickDeadzone"
    | "rightStickDeadzone"
) {
  const value = isSupportedGame(currentSettings?.gameName)
    ? currentSettings?.[key]
    : undefined;
  const bounds =
    key === "leftStickDeadzone" || key === "rightStickDeadzone"
      ? getSettingBounds(profile, "deadzone")
      : getSettingBounds(profile, key);
  return fitToBounds(value ?? profile.defaults[key], bounds);
}

function initialOptionalNumber(
  currentSettings: CurrentSettings | undefined,
  profile: GameSettingProfile,
  key:
    | "aimingSensitivityY"
    | "scopedSensitivityX"
    | "scopedSensitivityY"
    | "aimingAccelerationScale"
    | "aimingRampPowerScale",
  fallback = 0
) {
  if (isSupportedGame(currentSettings?.gameName) && currentSettings?.[key] !== undefined) {
    return currentSettings[key] ?? fallback;
  }
  return profile.defaults[key] ?? fallback;
}

function formatRange(min: number, max: number, step: number) {
  return `${min}-${max} / step ${step}`;
}

function valueTone(profile: GameSettingProfile) {
  return profile.theme === "fortnite" ? "Battle profile" : "Story profile";
}

export function SettingsSetup({ currentSettings, onSave }: SettingsSetupProps) {
  const profiles = listGameProfiles();
  const startingProfile = initialProfile(currentSettings);
  const [gameName, setGameName] = useState(startingProfile.gameName);
  const profile = useMemo(() => getGameProfile(gameName), [gameName]);
  const [platform, setPlatform] = useState<Platform>(startingProfile.platform);
  const [horizontalSensitivity, setHorizontalSensitivity] = useState(
    initialNumber(currentSettings, startingProfile, "horizontalSensitivity")
  );
  const [verticalSensitivity, setVerticalSensitivity] = useState(
    initialNumber(currentSettings, startingProfile, "verticalSensitivity")
  );
  const [adsSensitivity, setAdsSensitivity] = useState(
    initialNumber(currentSettings, startingProfile, "adsSensitivity")
  );
  const [leftStickDeadzone, setLeftStickDeadzone] = useState(
    initialNumber(currentSettings, startingProfile, "leftStickDeadzone")
  );
  const [rightStickDeadzone, setRightStickDeadzone] = useState(
    initialNumber(currentSettings, startingProfile, "rightStickDeadzone")
  );
  const [aimingSensitivityY, setAimingSensitivityY] = useState(
    initialOptionalNumber(currentSettings, startingProfile, "aimingSensitivityY")
  );
  const [scopedSensitivityX, setScopedSensitivityX] = useState(
    initialOptionalNumber(currentSettings, startingProfile, "scopedSensitivityX")
  );
  const [scopedSensitivityY, setScopedSensitivityY] = useState(
    initialOptionalNumber(currentSettings, startingProfile, "scopedSensitivityY")
  );
  const [aimingAccelerationScale, setAimingAccelerationScale] = useState(
    initialOptionalNumber(currentSettings, startingProfile, "aimingAccelerationScale")
  );
  const [aimingRampPowerScale, setAimingRampPowerScale] = useState(
    initialOptionalNumber(currentSettings, startingProfile, "aimingRampPowerScale")
  );
  const [weaponSwapInvert, setWeaponSwapInvert] = useState(
    isSupportedGame(currentSettings?.gameName) && currentSettings?.weaponSwapInvert !== undefined
      ? currentSettings.weaponSwapInvert
      : (startingProfile.defaults.weaponSwapInvert ?? false)
  );
  const [responseCurve, setResponseCurve] = useState(
    isSupportedGame(currentSettings?.gameName) &&
      currentSettings?.responseCurve &&
      startingProfile.responseCurveOptions.includes(currentSettings.responseCurve)
      ? currentSettings.responseCurve
      : startingProfile.defaults.responseCurve
  );
  const [aimSmoothing, setAimSmoothing] = useState(
    isSupportedGame(currentSettings?.gameName) && currentSettings?.aimSmoothing !== undefined
      ? currentSettings.aimSmoothing.toString()
      : (startingProfile.defaults.aimSmoothing?.toString() ?? "")
  );
  const [fieldOfView, setFieldOfView] = useState(
    isSupportedGame(currentSettings?.gameName) && currentSettings?.fieldOfView !== undefined
      ? currentSettings.fieldOfView.toString()
      : (startingProfile.defaults.fieldOfView?.toString() ?? "")
  );
  const [errors, setErrors] = useState<string[]>([]);

  const horizontalBounds = getSettingBounds(profile, "horizontalSensitivity");
  const verticalBounds = getSettingBounds(profile, "verticalSensitivity");
  const adsBounds = getSettingBounds(profile, "adsSensitivity");
  const deadzoneBounds = getSettingBounds(profile, "deadzone");
  const isTLOU2 = profile.theme === "tlou2";
  const optionalMax = profile.theme === "fortnite" ? 1 : 10;
  const optionalStep = profile.theme === "fortnite" ? 0.01 : 0.1;

  function useGame(nextProfile: GameSettingProfile) {
    setGameName(nextProfile.gameName);
    setPlatform(nextProfile.platform);
    setHorizontalSensitivity(nextProfile.defaults.horizontalSensitivity);
    setVerticalSensitivity(nextProfile.defaults.verticalSensitivity);
    setAdsSensitivity(nextProfile.defaults.adsSensitivity);
    setAimingSensitivityY(nextProfile.defaults.aimingSensitivityY ?? 0);
    setScopedSensitivityX(nextProfile.defaults.scopedSensitivityX ?? 0);
    setScopedSensitivityY(nextProfile.defaults.scopedSensitivityY ?? 0);
    setAimingAccelerationScale(nextProfile.defaults.aimingAccelerationScale ?? 0);
    setAimingRampPowerScale(nextProfile.defaults.aimingRampPowerScale ?? 0);
    setWeaponSwapInvert(nextProfile.defaults.weaponSwapInvert ?? false);
    setLeftStickDeadzone(nextProfile.defaults.leftStickDeadzone);
    setRightStickDeadzone(nextProfile.defaults.rightStickDeadzone);
    setResponseCurve(nextProfile.defaults.responseCurve);
    setAimSmoothing(nextProfile.defaults.aimSmoothing?.toString() ?? "");
    setFieldOfView(nextProfile.defaults.fieldOfView?.toString() ?? "");
    setErrors([]);
  }

  function saveSettings() {
    const next: CurrentSettings = {
      id: currentSettings?.id ?? crypto.randomUUID(),
      sessionId: currentSettings?.sessionId,
      gameName,
      platform,
      horizontalSensitivity,
      verticalSensitivity,
      adsSensitivity,
      leftStickDeadzone,
      rightStickDeadzone,
      responseCurve,
      aimingSensitivityY: isTLOU2 ? aimingSensitivityY : undefined,
      scopedSensitivityX: isTLOU2 ? scopedSensitivityX : undefined,
      scopedSensitivityY: isTLOU2 ? scopedSensitivityY : undefined,
      aimingAccelerationScale: isTLOU2 ? aimingAccelerationScale : undefined,
      aimingRampPowerScale: isTLOU2 ? aimingRampPowerScale : undefined,
      weaponSwapInvert: isTLOU2 ? weaponSwapInvert : undefined,
      aimSmoothing: isTLOU2 || aimSmoothing === "" ? undefined : Number(aimSmoothing),
      fieldOfView: isTLOU2 || fieldOfView === "" ? undefined : Number(fieldOfView)
    };
    const result = validateSettings(next);
    setErrors(result.errors);
    if (result.valid) onSave(next);
  }

  function renderNumberField(args: {
    label: string;
    hint: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
  }) {
    return (
      <label className="tune-field">
        <span>
          <strong>{args.label}</strong>
          <small>{args.hint}</small>
        </span>
        <div className="tune-field__control">
          <input
            type="range"
            min={args.min}
            max={args.max}
            step={args.step}
            value={args.value}
            onChange={(event) => args.onChange(Number(event.target.value))}
          />
          <input
            type="number"
            min={args.min}
            max={args.max}
            step={args.step}
            value={args.value}
            onChange={(event) =>
              args.onChange(fitToBounds(Number(event.target.value), args))
            }
          />
        </div>
        <em>{formatRange(args.min, args.max, args.step)}</em>
      </label>
    );
  }

  return (
    <main className="page page--settings">
      <div className="settings-hero">
        <div>
          <span className="eyebrow">Step 3</span>
          <h2>Game tuning setup</h2>
          <p>
            Pick your test game, mirror the controller values from that game's
            settings menu, then run calibration for exact values to apply yourself.
          </p>
        </div>
        <div className="settings-hero__badge">
          <span>{profile.shortName}</span>
          <strong>{valueTone(profile)}</strong>
        </div>
      </div>

      <section className="settings-layout">
        <aside className="game-picker" aria-label="Test game">
          {profiles.map((item) => (
            <button
              className={`game-card game-card--${item.theme} ${
                item.gameName === gameName ? "is-selected" : ""
              }`}
              key={item.gameName}
              onClick={() => useGame(item)}
            >
              <span>{item.shortName}</span>
              <strong>{item.playStyle}</strong>
              <small>{item.settingPath}</small>
            </button>
          ))}

          <div className="tuning-overview">
            <span className="eyebrow">UI overview</span>
            <h3>Current tune</h3>
            <div>
              <span>{profile.labels.horizontalSensitivity}</span>
              <strong>{horizontalSensitivity}</strong>
            </div>
            <div>
              <span>{isTLOU2 ? "Aiming Sensitivity X/Y" : profile.labels.adsSensitivity}</span>
              <strong>{isTLOU2 ? `${adsSensitivity}/${aimingSensitivityY}` : adsSensitivity}</strong>
            </div>
            <div>
              <span>{isTLOU2 ? "Scoped Sensitivity X/Y" : profile.labels.rightStickDeadzone}</span>
              <strong>{isTLOU2 ? `${scopedSensitivityX}/${scopedSensitivityY}` : rightStickDeadzone}</strong>
            </div>
            <div>
              <span>{isTLOU2 ? "Acceleration / Ramp" : profile.labels.responseCurve}</span>
              <strong>{isTLOU2 ? `${aimingAccelerationScale}/${aimingRampPowerScale}` : responseCurve}</strong>
            </div>
          </div>
        </aside>

        <section className={`settings-console settings-console--${profile.theme}`}>
          <div className="settings-console__top">
            <div>
              <span className="eyebrow">Source values</span>
              <h3>{profile.gameName}</h3>
              <p>{profile.settingPath}</p>
            </div>
            <div className="platform-lock">
              <span>Platform</span>
              <strong>{platform === "playstation" ? "PlayStation" : "PC"}</strong>
            </div>
          </div>

          {isTLOU2 ? (
            <div className="tlou-menu-tabs" aria-label="The Last of Us Part II controls tab">
              <span>OPTIONS</span>
              <strong>CONTROLS</strong>
            </div>
          ) : null}

          {isTLOU2 ? (
            <div className="settings-section settings-section--toggle">
              <div>
                <span className="eyebrow">Controls</span>
                <h4>Options</h4>
              </div>
              <label className="toggle-field">
                <span>
                  <strong>{profile.labels.weaponSwapInvert}</strong>
                  <small>{profile.hints.weaponSwapInvert}</small>
                </span>
                <button
                  className={`switch-control ${weaponSwapInvert ? "is-on" : ""}`}
                  onClick={() => setWeaponSwapInvert((current) => !current)}
                  type="button"
                >
                  <span>{weaponSwapInvert ? "On" : "Off"}</span>
                </button>
              </label>
            </div>
          ) : null}

          <div className="settings-section">
            <div>
              <span className="eyebrow">Look</span>
              <h4>{isTLOU2 ? "Camera sensitivity" : "Camera speed"}</h4>
            </div>
            <div className="settings-field-grid">
              {renderNumberField({
                label: profile.labels.horizontalSensitivity,
                hint: profile.hints.horizontalSensitivity,
                value: horizontalSensitivity,
                min: horizontalBounds.min,
                max: horizontalBounds.max,
                step: horizontalBounds.step,
                onChange: setHorizontalSensitivity
              })}
              {renderNumberField({
                label: profile.labels.verticalSensitivity,
                hint: profile.hints.verticalSensitivity,
                value: verticalSensitivity,
                min: verticalBounds.min,
                max: verticalBounds.max,
                step: verticalBounds.step,
                onChange: setVerticalSensitivity
              })}
            </div>
          </div>

          <div className="settings-section">
            <div>
              <span className="eyebrow">Aim</span>
              <h4>{isTLOU2 ? "Aiming and scoped sensitivity" : "Precision feel"}</h4>
            </div>
            <div className="settings-field-grid">
              {renderNumberField({
                label: profile.labels.adsSensitivity,
                hint: profile.hints.adsSensitivity,
                value: adsSensitivity,
                min: adsBounds.min,
                max: adsBounds.max,
                step: adsBounds.step,
                onChange: setAdsSensitivity
              })}
              {isTLOU2 ? (
                <>
                  {renderNumberField({
                    label: profile.labels.aimingSensitivityY ?? "Aiming Sensitivity Y",
                    hint: profile.hints.aimingSensitivityY ?? "",
                    value: aimingSensitivityY,
                    min: adsBounds.min,
                    max: adsBounds.max,
                    step: adsBounds.step,
                    onChange: setAimingSensitivityY
                  })}
                  {renderNumberField({
                    label: profile.labels.scopedSensitivityX ?? "Scoped Sensitivity X",
                    hint: profile.hints.scopedSensitivityX ?? "",
                    value: scopedSensitivityX,
                    min: 0,
                    max: 100,
                    step: 1,
                    onChange: setScopedSensitivityX
                  })}
                  {renderNumberField({
                    label: profile.labels.scopedSensitivityY ?? "Scoped Sensitivity Y",
                    hint: profile.hints.scopedSensitivityY ?? "",
                    value: scopedSensitivityY,
                    min: 0,
                    max: 100,
                    step: 1,
                    onChange: setScopedSensitivityY
                  })}
                </>
              ) : (
                <label className="tune-field">
                  <span>
                    <strong>{profile.labels.responseCurve}</strong>
                    <small>{profile.hints.responseCurve}</small>
                  </span>
                  <select
                    value={responseCurve}
                    onChange={(event) => setResponseCurve(event.target.value)}
                  >
                    {profile.responseCurveOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <em>{profile.responseCurveOptions.join(" / ")}</em>
                </label>
              )}
            </div>
          </div>

          {isTLOU2 ? (
            <div className="settings-section">
              <div>
                <span className="eyebrow">Aim response</span>
                <h4>Acceleration curve</h4>
              </div>
              <div className="settings-field-grid">
                {renderNumberField({
                  label: profile.labels.aimingAccelerationScale ?? "Aiming Acceleration Scale",
                  hint: profile.hints.aimingAccelerationScale ?? "",
                  value: aimingAccelerationScale,
                  min: 0,
                  max: 10,
                  step: 1,
                  onChange: setAimingAccelerationScale
                })}
                {renderNumberField({
                  label: profile.labels.aimingRampPowerScale ?? "Aiming Ramp Power Scale",
                  hint: profile.hints.aimingRampPowerScale ?? "",
                  value: aimingRampPowerScale,
                  min: 0,
                  max: 10,
                  step: 1,
                  onChange: setAimingRampPowerScale
                })}
              </div>
            </div>
          ) : null}

          <div className="settings-section">
            <div>
              <span className="eyebrow">Sticks</span>
              <h4>{isTLOU2 ? "AimTune deadzone reference" : "Deadzone control"}</h4>
            </div>
            <div className="settings-field-grid">
              {renderNumberField({
                label: profile.labels.leftStickDeadzone,
                hint: profile.hints.leftStickDeadzone,
                value: leftStickDeadzone,
                min: deadzoneBounds.min,
                max: deadzoneBounds.max,
                step: deadzoneBounds.step,
                onChange: setLeftStickDeadzone
              })}
              {renderNumberField({
                label: profile.labels.rightStickDeadzone,
                hint: profile.hints.rightStickDeadzone,
                value: rightStickDeadzone,
                min: deadzoneBounds.min,
                max: deadzoneBounds.max,
                step: deadzoneBounds.step,
                onChange: setRightStickDeadzone
              })}
            </div>
          </div>

          {!isTLOU2 ? (
            <div className="settings-section">
              <div>
                <span className="eyebrow">Optional</span>
                <h4>Context values</h4>
              </div>
              <div className="settings-field-grid">
                <label className="tune-field">
                  <span>
                    <strong>{profile.labels.aimSmoothing}</strong>
                    <small>{profile.hints.aimSmoothing}</small>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={optionalMax}
                    step={optionalStep}
                    value={aimSmoothing}
                    onChange={(event) => setAimSmoothing(event.target.value)}
                    placeholder="Optional"
                  />
                  <em>Optional reference value</em>
                </label>

                <label className="tune-field">
                  <span>
                    <strong>{profile.labels.fieldOfView}</strong>
                    <small>{profile.hints.fieldOfView}</small>
                  </span>
                  <input
                    type="number"
                    min="60"
                    max="120"
                    step="1"
                    value={fieldOfView}
                    onChange={(event) => setFieldOfView(event.target.value)}
                    placeholder="Optional"
                  />
                  <em>Used as context, not required</em>
                </label>
              </div>
            </div>
          ) : null}

          {errors.length ? (
            <div className="error-list">
              {errors.map((error) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          ) : null}

          <div className="footer-actions settings-actions">
            <button className="button" onClick={saveSettings}>
              Save and calibrate
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
