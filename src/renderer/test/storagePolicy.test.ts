import { describe, expect, it } from "vitest";
import { storageSafetyPolicy, storageSchemaVersion } from "../services/storageService";

describe("storage policy", () => {
  it("stores only metrics and summaries", () => {
    expect(storageSchemaVersion).toBe(1);
    expect(storageSafetyPolicy.storesFrames).toBe(false);
    expect(storageSafetyPolicy.storesScreenshots).toBe(false);
    expect(storageSafetyPolicy.storesClips).toBe(false);
    expect(storageSafetyPolicy.storesAudio).toBe(false);
  });
});
