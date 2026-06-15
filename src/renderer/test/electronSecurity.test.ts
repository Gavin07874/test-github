import { describe, expect, it } from "vitest";
import {
  isAllowedDevServerUrl,
  isAllowedExternalUrl,
  isTrustedAppNavigation
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
});
