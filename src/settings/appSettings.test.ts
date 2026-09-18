import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./appSettings";

describe("app settings", () => {
  it("enables live synchronization by default", () => {
    expect(normalizeSettings(null).outputEngine).toBe("html");
    expect(normalizeSettings(null).liveSync).toBe(true);
    expect(normalizeSettings(null).diskBackupEnabled).toBe(true);
  });
  it("migrates old settings to HTML and preserves an explicit Typst selection", () => {
    expect(normalizeSettings({ previewZoom: 80 }).outputEngine).toBe("html");
    expect(normalizeSettings({ outputEngine: "invalid" }).outputEngine).toBe("html");
    expect(normalizeSettings({ outputEngine: "typst" }).outputEngine).toBe("typst");
  });

  it("preserves supported values", () => {
    const settings = normalizeSettings({
      liveSync: false,
      diskBackupEnabled: false,
      syncDelayMs: 300,
      saveDelayMs: 1000,
      exportEngine: "browser",
      showOverflowWarning: false,
      previewZoom: 80,
      previewOpen: false,
    });
    expect(settings).not.toHaveProperty("exportEngine");
    expect(settings).toMatchObject({ liveSync: false, diskBackupEnabled: false, syncDelayMs: 300, previewZoom: 80, previewOpen: false });
  });

  it("falls back for unsupported values", () => {
    const settings = normalizeSettings({ syncDelayMs: 999, previewZoom: 20 });
    expect(settings.syncDelayMs).toBe(DEFAULT_SETTINGS.syncDelayMs);
    expect(settings.previewZoom).toBe(DEFAULT_SETTINGS.previewZoom);
  });

  it("keeps the preview open for settings saved before preview persistence", () => {
    expect(normalizeSettings({ previewZoom: 80 }).previewOpen).toBe(true);
  });
});
