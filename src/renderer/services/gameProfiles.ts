import type {
  CurrentSettings,
  GameSettingProfile,
  Platform
} from "../types";

const profiles: GameSettingProfile[] = [
  {
    gameName: "Fortnite",
    shortName: "Fortnite",
    platform: "pc",
    settingPath: "Settings > Controller Options",
    playStyle: "Fast edits, close-range tracking, and snap flicks.",
    theme: "fortnite",
    horizontalSensitivityMin: 1,
    horizontalSensitivityMax: 100,
    horizontalSensitivityStep: 1,
    verticalSensitivityMin: 1,
    verticalSensitivityMax: 100,
    verticalSensitivityStep: 1,
    adsSensitivityMin: 1,
    adsSensitivityMax: 100,
    adsSensitivityStep: 1,
    deadzoneMin: 0,
    deadzoneMax: 0.5,
    deadzoneStep: 0.01,
    responseCurveOptions: ["Exponential", "Linear"],
    labels: {
      horizontalSensitivity: "Look Horizontal Speed",
      verticalSensitivity: "Look Vertical Speed",
      adsSensitivity: "ADS Look Sensitivity",
      leftStickDeadzone: "Left Stick Dead Zone",
      rightStickDeadzone: "Right Stick Dead Zone",
      responseCurve: "Look Input Curve",
      aimSmoothing: "Look Dampening Time",
      fieldOfView: "Field of View"
    },
    hints: {
      horizontalSensitivity: "Controller look horizontal speed, entered as the in-game percent value.",
      verticalSensitivity: "Controller look vertical speed, entered as the in-game percent value.",
      adsSensitivity: "ADS look sensitivity percent used while aiming down sights.",
      leftStickDeadzone: "Movement stick dead zone as a decimal, for example 0.10.",
      rightStickDeadzone: "Look stick dead zone as a decimal, for example 0.08.",
      responseCurve: "Fortnite's controller look curve.",
      aimSmoothing: "Optional dampening time if you use advanced look controls.",
      fieldOfView: "Optional PC field of view reference for your test setup."
    },
    defaults: {
      horizontalSensitivity: 40,
      verticalSensitivity: 40,
      adsSensitivity: 12,
      leftStickDeadzone: 0.1,
      rightStickDeadzone: 0.08,
      responseCurve: "Exponential",
      aimSmoothing: 0.2,
      fieldOfView: 100
    }
  },
  {
    gameName: "The Last of Us Part II",
    shortName: "TLOU Part II",
    platform: "playstation",
    settingPath: "Options > Controls > Camera Sensitivity",
    playStyle: "Cinematic camera control, slower reticle stability, and precision aim.",
    theme: "tlou2",
    horizontalSensitivityMin: 0,
    horizontalSensitivityMax: 100,
    horizontalSensitivityStep: 1,
    verticalSensitivityMin: 0,
    verticalSensitivityMax: 100,
    verticalSensitivityStep: 1,
    adsSensitivityMin: 0,
    adsSensitivityMax: 100,
    adsSensitivityStep: 1,
    deadzoneMin: 0,
    deadzoneMax: 0.5,
    deadzoneStep: 0.01,
    responseCurveOptions: ["Default", "Linear", "Precision"],
    labels: {
      horizontalSensitivity: "Look Sensitivity X",
      verticalSensitivity: "Look Sensitivity Y",
      adsSensitivity: "Aiming Sensitivity X",
      aimingSensitivityY: "Aiming Sensitivity Y",
      scopedSensitivityX: "Scoped Sensitivity X",
      scopedSensitivityY: "Scoped Sensitivity Y",
      aimingAccelerationScale: "Aiming Acceleration Scale",
      aimingRampPowerScale: "Aiming Ramp Power Scale",
      weaponSwapInvert: "Weapon Swap Invert",
      leftStickDeadzone: "Movement Stick Deadzone",
      rightStickDeadzone: "Camera Stick Deadzone",
      responseCurve: "Aim Response",
      aimSmoothing: "Aiming Acceleration Scale",
      fieldOfView: "Camera Distance"
    },
    hints: {
      horizontalSensitivity: "Matches Look Sensitivity X in Options > Controls.",
      verticalSensitivity: "Matches Look Sensitivity Y in Options > Controls.",
      adsSensitivity: "Matches Aiming Sensitivity X in the Camera Sensitivity list.",
      aimingSensitivityY: "Matches Aiming Sensitivity Y in the Camera Sensitivity list.",
      scopedSensitivityX: "Matches Scoped Sensitivity X for scoped weapon aim.",
      scopedSensitivityY: "Matches Scoped Sensitivity Y for scoped weapon aim.",
      aimingAccelerationScale: "Matches Aiming Acceleration Scale.",
      aimingRampPowerScale: "Matches Aiming Ramp Power Scale.",
      weaponSwapInvert: "Matches the Weapon Swap Invert toggle.",
      leftStickDeadzone: "Movement stick deadzone as a decimal reference.",
      rightStickDeadzone: "Camera stick deadzone as a decimal reference.",
      responseCurve: "Response feel used by AimTune when translating calibration signals.",
      aimSmoothing: "Matches Aiming Acceleration Scale.",
      fieldOfView: "Optional camera-distance reference if adjusted in your setup."
    },
    defaults: {
      horizontalSensitivity: 65,
      verticalSensitivity: 65,
      adsSensitivity: 55,
      aimingSensitivityY: 55,
      scopedSensitivityX: 30,
      scopedSensitivityY: 30,
      aimingAccelerationScale: 5,
      aimingRampPowerScale: 3,
      weaponSwapInvert: false,
      leftStickDeadzone: 0.1,
      rightStickDeadzone: 0.08,
      responseCurve: "Default"
    }
  }
];

export function listGameProfiles() {
  return profiles;
}

export function getGameProfile(gameName: string, platform?: Platform) {
  const normalized = gameName.trim().toLowerCase();
  return (
    profiles.find(
      (profile) =>
        profile.gameName.toLowerCase() === normalized &&
        (!platform || profile.platform === platform)
    ) ??
    profiles.find((profile) => profile.gameName.toLowerCase() === normalized) ??
    profiles[0]
  );
}

export function isSupportedGame(gameName?: string) {
  if (!gameName) return false;
  const normalized = gameName.trim().toLowerCase();
  return profiles.some((profile) => profile.gameName.toLowerCase() === normalized);
}

export function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundToStep(value: number, step: number, min = 0) {
  const decimals = Math.max(0, `${step}`.split(".")[1]?.length ?? 0);
  const rounded = Math.round((value - min) / step) * step + min;
  return Number(rounded.toFixed(decimals));
}

export function clampAndRound(value: number, min: number, max: number, step: number) {
  return roundToStep(clampValue(value, min, max), step, min);
}

export function getSettingBounds(
  profile: GameSettingProfile,
  settingName: "horizontalSensitivity" | "verticalSensitivity" | "adsSensitivity" | "deadzone"
) {
  if (settingName === "horizontalSensitivity") {
    return {
      min: profile.horizontalSensitivityMin,
      max: profile.horizontalSensitivityMax,
      step: profile.horizontalSensitivityStep
    };
  }
  if (settingName === "verticalSensitivity") {
    return {
      min: profile.verticalSensitivityMin,
      max: profile.verticalSensitivityMax,
      step: profile.verticalSensitivityStep
    };
  }
  if (settingName === "adsSensitivity") {
    return {
      min: profile.adsSensitivityMin,
      max: profile.adsSensitivityMax,
      step: profile.adsSensitivityStep
    };
  }
  return {
    min: profile.deadzoneMin,
    max: profile.deadzoneMax,
    step: profile.deadzoneStep
  };
}

export function validateSettings(settings: CurrentSettings) {
  const profile = getGameProfile(settings.gameName, settings.platform);
  const errors: string[] = [];

  const checks = [
    {
      label: profile.labels.horizontalSensitivity,
      value: settings.horizontalSensitivity,
      bounds: getSettingBounds(profile, "horizontalSensitivity")
    },
    {
      label: profile.labels.verticalSensitivity,
      value: settings.verticalSensitivity,
      bounds: getSettingBounds(profile, "verticalSensitivity")
    },
    {
      label: profile.labels.adsSensitivity,
      value: settings.adsSensitivity,
      bounds: getSettingBounds(profile, "adsSensitivity")
    },
    {
      label: profile.labels.leftStickDeadzone,
      value: settings.leftStickDeadzone,
      bounds: getSettingBounds(profile, "deadzone")
    },
    {
      label: profile.labels.rightStickDeadzone,
      value: settings.rightStickDeadzone,
      bounds: getSettingBounds(profile, "deadzone")
    }
  ];

  for (const check of checks) {
    if (check.value < check.bounds.min || check.value > check.bounds.max) {
      errors.push(
        `${check.label} must be between ${check.bounds.min} and ${check.bounds.max}.`
      );
    }
  }

  if (profile.theme === "tlou2") {
    const tlouChecks = [
      {
        label: profile.labels.aimingSensitivityY ?? "Aiming Sensitivity Y",
        value: settings.aimingSensitivityY,
        min: 0,
        max: 100
      },
      {
        label: profile.labels.scopedSensitivityX ?? "Scoped Sensitivity X",
        value: settings.scopedSensitivityX,
        min: 0,
        max: 100
      },
      {
        label: profile.labels.scopedSensitivityY ?? "Scoped Sensitivity Y",
        value: settings.scopedSensitivityY,
        min: 0,
        max: 100
      },
      {
        label: profile.labels.aimingAccelerationScale ?? "Aiming Acceleration Scale",
        value: settings.aimingAccelerationScale,
        min: 0,
        max: 10
      },
      {
        label: profile.labels.aimingRampPowerScale ?? "Aiming Ramp Power Scale",
        value: settings.aimingRampPowerScale,
        min: 0,
        max: 10
      }
    ];

    for (const check of tlouChecks) {
      if (
        check.value === undefined ||
        check.value < check.min ||
        check.value > check.max
      ) {
        errors.push(`${check.label} must be between ${check.min} and ${check.max}.`);
      }
    }
  }

  if (!profile.responseCurveOptions.includes(settings.responseCurve)) {
    errors.push(
      `${profile.labels.responseCurve} must be one of: ${profile.responseCurveOptions.join(", ")}.`
    );
  }

  return {
    profile,
    valid: errors.length === 0,
    errors
  };
}
