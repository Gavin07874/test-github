import { describe, expect, it } from "vitest";
import {
  isCapturableWindowSource,
  validateDisplayCapturePermission,
  validateDisplayMediaRequest
} from "../../main/security";

describe("capture security policy", () => {
  const request = {
    securityOrigin: "http://127.0.0.1:5173/",
    videoRequested: true,
    audioRequested: false,
    userGesture: true,
    selectedSourceId: "window:12:0",
    startTokenArmed: true
  };

  it("allows only selected trusted window capture", () => {
    expect(validateDisplayMediaRequest(request, true).allowed).toBe(true);
    expect(validateDisplayMediaRequest({ ...request, audioRequested: true }, true).reason).toBe("audio_denied");
    expect(validateDisplayMediaRequest({ ...request, userGesture: false }, true).allowed).toBe(true);
    expect(validateDisplayMediaRequest({ ...request, userGesture: false, startTokenArmed: false }, true).reason).toBe("missing_user_gesture");
    expect(validateDisplayMediaRequest({ ...request, securityOrigin: "https://evil.example" }, true).reason).toBe("untrusted_origin");
    expect(validateDisplayMediaRequest({ ...request, selectedSourceId: undefined }, true).reason).toBe("source_not_selected");
    expect(validateDisplayMediaRequest({ ...request, selectedSourceId: "screen:1:0" }, true).reason).toBe("display_capture_denied");
  });

  it("allows only display-capture permission for a selected trusted window source", () => {
    const permission = {
      permission: "display-capture",
      requestingOrigin: "http://127.0.0.1:5173/",
      selectedSourceId: "window:12:0",
      startTokenArmed: true
    };

    expect(validateDisplayCapturePermission(permission, true).allowed).toBe(true);
    expect(validateDisplayCapturePermission({ ...permission, permission: "media" }, true).reason).toBe("permission_denied");
    expect(validateDisplayCapturePermission({ ...permission, requestingOrigin: "https://evil.example" }, true).reason).toBe("untrusted_origin");
    expect(validateDisplayCapturePermission({ ...permission, selectedSourceId: undefined }, true).reason).toBe("source_not_selected");
    expect(validateDisplayCapturePermission({ ...permission, selectedSourceId: "screen:1:0" }, true).reason).toBe("display_capture_denied");
    expect(validateDisplayCapturePermission({ ...permission, startTokenArmed: false }, true).reason).toBe("capture_not_armed");
  });

  it("filters out AimTune and non-window sources", () => {
    expect(isCapturableWindowSource({ id: "window:1:0", name: "Fortnite" })).toBe(true);
    expect(isCapturableWindowSource({ id: "screen:1:0", name: "Display" })).toBe(false);
    expect(isCapturableWindowSource({ id: "window:2:0", name: "AimTune AI" })).toBe(false);
    expect(isCapturableWindowSource({ id: "window:3:0", name: "" })).toBe(false);
  });
});
