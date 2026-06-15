import { describe, expect, it } from "vitest";
import { getGameProfile, validateSettings } from "../services/gameProfiles";
import type { CurrentSettings } from "../types";

describe("gameProfiles", () => {
  it("keeps The Last of Us Part II defaults aligned with the Controls screen", () => {
    const profile = getGameProfile("The Last of Us Part II", "playstation");

    expect(profile.labels.horizontalSensitivity).toBe("Look Sensitivity X");
    expect(profile.labels.verticalSensitivity).toBe("Look Sensitivity Y");
    expect(profile.labels.adsSensitivity).toBe("Aiming Sensitivity X");
    expect(profile.defaults.horizontalSensitivity).toBe(65);
    expect(profile.defaults.verticalSensitivity).toBe(65);
    expect(profile.defaults.adsSensitivity).toBe(55);
    expect(profile.defaults.aimingSensitivityY).toBe(55);
    expect(profile.defaults.scopedSensitivityX).toBe(30);
    expect(profile.defaults.scopedSensitivityY).toBe(30);
    expect(profile.defaults.aimingAccelerationScale).toBe(5);
    expect(profile.defaults.aimingRampPowerScale).toBe(3);
    expect(profile.defaults.weaponSwapInvert).toBe(false);
  });

  it("validates The Last of Us Part II extended controls", () => {
    const settings: CurrentSettings = {
      id: "tlou-settings",
      gameName: "The Last of Us Part II",
      platform: "playstation",
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
    };

    expect(validateSettings(settings).valid).toBe(true);
    expect(
      validateSettings({
        ...settings,
        scopedSensitivityY: 101
      }).valid
    ).toBe(false);
  });
});
