import { describe, expect, it } from "vitest";
import { shouldCreateSnapshot } from "./diskBackup";

describe("disk backup snapshots", () => {
  it("creates the first snapshot immediately", () => {
    expect(shouldCreateSnapshot(null, 100)).toBe(true);
  });

  it("limits periodic snapshots to one every ten minutes", () => {
    expect(shouldCreateSnapshot(1_000, 1_000 + 9 * 60 * 1_000)).toBe(false);
    expect(shouldCreateSnapshot(1_000, 1_000 + 10 * 60 * 1_000)).toBe(true);
  });
});
