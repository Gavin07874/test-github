import { describe, expect, it } from "vitest";
import { storageSchemaVersion } from "../services/storageService";

describe("storageService", () => {
  it("uses the Dexie v2 schema for screen capture tables", () => {
    expect(storageSchemaVersion).toBe(2);
  });
});
