import type { GameId, GameProfile, SettingsMirror } from "../types";

const fortniteDefaults: SettingsMirror = {
  lookX: 40,
  lookY: 40,
  aimX: 12,
  aimY: 12,
  scopedX: 12,
  scopedY: 12,
  leftDeadzone: 0.1,
  rightDeadzone: 0.08,
  acceleration: 0.2,
  rampPower: 0,
  responseCurve: "Exponential",
  weaponSwapInvert: false
};

const tlouDefaults: SettingsMirror = {
  lookX: 65,
  lookY: 65,
  aimX: 55,
  aimY: 55,
  scopedX: 30,
  scopedY: 30,
  leftDeadzone: 0.1,
  rightDeadzone: 0.08,
  acceleration: 5,
  rampPower: 3,
  responseCurve: "Default",
  weaponSwapInvert: false
};

export const gameProfiles: GameProfile[] = [
  {
    id: "fortnite",
    name: "Fortnite",
    shortName: "Fortnite",
    platform: "pc",
    settingPath: "Settings > Controller Options",
    theme: "fortnite",
    description: "Fast edits, close tracking, snap flicks, and high camera movement.",
    responseCurves: ["Exponential", "Linear"],
    defaults: fortniteDefaults,
    settings: [
      { key: "lookX", label: "Look Horizontal Speed", min: 1, max: 100, step: 1, section: "Look", hint: "Horizontal look speed percent." },
      { key: "lookY", label: "Look Vertical Speed", min: 1, max: 100, step: 1, section: "Look", hint: "Vertical look speed percent." },
      { key: "aimX", label: "ADS Look Sensitivity", min: 1, max: 100, step: 1, section: "Aim", hint: "Aim-down-sights look sensitivity percent." },
      { key: "leftDeadzone", label: "Left Stick Dead Zone", min: 0, max: 0.5, step: 0.01, section: "Sticks", hint: "Movement stick deadzone." },
      { key: "rightDeadzone", label: "Right Stick Dead Zone", min: 0, max: 0.5, step: 0.01, section: "Sticks", hint: "Look stick deadzone." },
      { key: "acceleration", label: "Look Dampening Time", min: 0, max: 1, step: 0.01, section: "Advanced", hint: "Optional advanced look dampening reference." }
    ]
  },
  {
    id: "tlou2",
    name: "The Last of Us Part II",
    shortName: "TLOU Part II",
    platform: "playstation",
    settingPath: "Options > Controls > Camera Sensitivity",
    theme: "tlou2",
    description: "Cinematic camera control, stable aiming, scoped precision, and slower tracking.",
    responseCurves: ["Default", "Linear", "Precision"],
    defaults: tlouDefaults,
    settings: [
      { key: "lookX", label: "Look Sensitivity X", min: 0, max: 100, step: 1, section: "Camera Sensitivity", hint: "Matches the TLOU controls screen." },
      { key: "lookY", label: "Look Sensitivity Y", min: 0, max: 100, step: 1, section: "Camera Sensitivity", hint: "Matches the TLOU controls screen." },
      { key: "aimX", label: "Aiming Sensitivity X", min: 0, max: 100, step: 1, section: "Camera Sensitivity", hint: "Horizontal aim sensitivity." },
      { key: "aimY", label: "Aiming Sensitivity Y", min: 0, max: 100, step: 1, section: "Camera Sensitivity", hint: "Vertical aim sensitivity." },
      { key: "scopedX", label: "Scoped Sensitivity X", min: 0, max: 100, step: 1, section: "Camera Sensitivity", hint: "Horizontal scoped sensitivity." },
      { key: "scopedY", label: "Scoped Sensitivity Y", min: 0, max: 100, step: 1, section: "Camera Sensitivity", hint: "Vertical scoped sensitivity." },
      { key: "acceleration", label: "Aiming Acceleration Scale", min: 0, max: 10, step: 1, section: "Camera Sensitivity", hint: "Acceleration scale shown in TLOU." },
      { key: "rampPower", label: "Aiming Ramp Power Scale", min: 0, max: 10, step: 1, section: "Camera Sensitivity", hint: "Ramp power scale shown in TLOU." },
      { key: "rightDeadzone", label: "Camera Stick Deadzone", min: 0, max: 0.5, step: 0.01, section: "Sticks", hint: "Camera stick deadzone reference." },
      { key: "leftDeadzone", label: "Movement Stick Deadzone", min: 0, max: 0.5, step: 0.01, section: "Sticks", hint: "Movement stick deadzone reference." }
    ]
  }
];

export function getGameProfile(gameId: GameId) {
  return gameProfiles.find((profile) => profile.id === gameId) ?? gameProfiles[0];
}

export function cloneDefaults(gameId: GameId): SettingsMirror {
  return { ...getGameProfile(gameId).defaults };
}

export function clampToStep(value: number, min: number, max: number, step: number) {
  const bounded = Math.min(max, Math.max(min, value));
  const decimals = Math.max(0, `${step}`.split(".")[1]?.length ?? 0);
  return Number((Math.round((bounded - min) / step) * step + min).toFixed(decimals));
}
