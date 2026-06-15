import { describe, expect, it } from "vitest";
import { shouldRecordTelemetry } from "../services/sessionRecorder";

describe("sessionRecorder", () => {
  it("records telemetry only when a controller is connected", () => {
    expect(shouldRecordTelemetry(true)).toBe(true);
    expect(shouldRecordTelemetry(false)).toBe(false);
  });
});
