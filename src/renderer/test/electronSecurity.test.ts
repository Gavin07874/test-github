import { describe, expect, it } from "vitest";
import {
  isCapturableWindowSource,
  isAllowedDevServerUrl,
  isAllowedExternalUrl,
  isTrustedAppNavigation,
  validateDisplayMediaRequest
} from "../../main/security";

describe("Electron security policy helpers", () => {
  it("allows only http and https URLs to leave the app shell", () => {
    expect(isAllowedExternalUrl("https://example.com")).toBe(true);
    expect(isAllowedExternalUrl("http://example.com")).toBe(true);
    expect(isAllowedExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedExternalUrl("aimtune://settings")).toBe(false);
  });

  it("loads only the expected loopback Vite server in development", () => {
    expect(isAllowedDevServerUrl("http://127.0.0.1:5173/")).toBe(true);
    expect(isAllowedDevServerUrl("http://localhost:5173/")).toBe(true);
    expect(isAllowedDevServerUrl("https://127.0.0.1:5173/")).toBe(false);
    expect(isAllowedDevServerUrl("http://127.0.0.1:9999/")).toBe(false);
    expect(isAllowedDevServerUrl("http://example.com:5173/")).toBe(false);
  });

  it("prevents production navigation away from packaged app files", () => {
    expect(isTrustedAppNavigation("file:///app/dist/index.html", false)).toBe(true);
    expect(isTrustedAppNavigation("https://example.com", false)).toBe(false);
    expect(isTrustedAppNavigation("http://127.0.0.1:5173/", true)).toBe(true);
  });

  it("denies unsafe display-media requests", () => {
    const trustedRequest = {
      securityOrigin: "http://127.0.0.1:5173/",
      videoRequested: true,
      audioRequested: false,
      userGesture: true,
      selectedSourceId: "window:123:0"
    };

    expect(validateDisplayMediaRequest(trustedRequest, true).allowed).toBe(true);
    expect(
      validateDisplayMediaRequest({ ...trustedRequest, audioRequested: true }, true)
        .reason
    ).toBe("audio_denied");
    expect(
      validateDisplayMediaRequest({ ...trustedRequest, userGesture: false }, true)
        .reason
    ).toBe("missing_user_gesture");
    expect(
      validateDisplayMediaRequest(
        { ...trustedRequest, securityOrigin: "https://evil.example" },
        true
      ).reason
    ).toBe("untrusted_origin");
    expect(
      validateDisplayMediaRequest(
        { ...trustedRequest, selectedSourceId: undefined },
        true
      ).reason
    ).toBe("source_not_selected");
    expect(
      validateDisplayMediaRequest(
        { ...trustedRequest, selectedSourceId: "screen:1:0" },
        true
      ).reason
    ).toBe("display_capture_denied");
  });

  it("filters capture sources to non-AimTune windows only", () => {
    expect(isCapturableWindowSource({ id: "window:1:0", name: "Fortnite" })).toBe(
      true
    );
    expect(isCapturableWindowSource({ id: "screen:1:0", name: "Main Display" })).toBe(
      false
    );
    expect(isCapturableWindowSource({ id: "window:2:0", name: "AimTune AI" })).toBe(
      false
    );
    expect(isCapturableWindowSource({ id: "window:3:0", name: "" })).toBe(false);
  });
});
