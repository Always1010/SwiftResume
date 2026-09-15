import { describe, expect, it } from "vitest";
import { compareSyncVersion } from "./resumeSync";

describe("resume sync version", () => {
  it("prefers the later logical clock", () => {
    expect(compareSyncVersion({ clock: 2, clientId: "a" }, { clock: 1, clientId: "z" })).toBeGreaterThan(0);
  });

  it("uses client id as a deterministic tie breaker", () => {
    expect(compareSyncVersion({ clock: 2, clientId: "b" }, { clock: 2, clientId: "a" })).toBeGreaterThan(0);
  });

  it("recognizes the same version", () => {
    expect(compareSyncVersion({ clock: 2, clientId: "a" }, { clock: 2, clientId: "a" })).toBe(0);
  });
});
