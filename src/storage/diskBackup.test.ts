import { describe, expect, it } from "vitest";
import { historySnapshotsToDelete, profilePhotoAsset, shouldCreateSnapshot } from "./diskBackup";

describe("disk backup snapshots", () => {
  it("creates the first snapshot immediately", () => {
    expect(shouldCreateSnapshot(null, 100, "v1")).toBe(true);
  });

  it("only creates changed periodic snapshots every ten minutes", () => {
    const previous = { savedAt: 1_000, resumeUpdatedAt: "v1" };
    expect(shouldCreateSnapshot(previous, 1_000 + 20 * 60 * 1_000, "v1")).toBe(false);
    expect(shouldCreateSnapshot(previous, 1_000 + 9 * 60 * 1_000, "v2")).toBe(false);
    expect(shouldCreateSnapshot(previous, 1_000 + 10 * 60 * 1_000, "v2")).toBe(true);
  });

  it("extracts profile photos as independent image assets", () => {
    const asset = profilePhotoAsset("data:image/png;base64,aGVsbG8=");
    expect(asset?.extension).toBe("png");
    expect(asset?.mimeType).toBe("image/png");
    expect(new TextDecoder().decode(asset?.bytes)).toBe("hello");
  });

  it("keeps only the twenty newest history snapshots", () => {
    const names = Array.from({ length: 23 }, (_, index) =>
      `2026-09-15T10-${String(index).padStart(2, "0")}-00.000Z.swiftresume.json`,
    );
    expect(historySnapshotsToDelete(names)).toEqual(names.slice(0, 3).reverse());
  });
});
