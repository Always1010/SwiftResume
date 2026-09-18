export type PreviewZoom = "fit" | 70 | 80 | 90 | 100;
export type OutputEngine = "html" | "typst";
export type SyncDelay = 0 | 100 | 300;
export type SaveDelay = 300 | 500 | 1000;

export interface AppSettings {
  version: 1;
  liveSync: boolean;
  diskBackupEnabled: boolean;
  syncDelayMs: SyncDelay;
  saveDelayMs: SaveDelay;
  showOverflowWarning: boolean;
  previewZoom: PreviewZoom;
  previewOpen: boolean;
  outputEngine: OutputEngine;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  liveSync: true,
  diskBackupEnabled: true,
  syncDelayMs: 0,
  saveDelayMs: 500,
  showOverflowWarning: true,
  previewZoom: "fit",
  previewOpen: true,
  outputEngine: "html",
};

const STORAGE_KEY = "swift-resume:settings";

const allowedSyncDelays = new Set<SyncDelay>([0, 100, 300]);
const allowedSaveDelays = new Set<SaveDelay>([300, 500, 1000]);
const allowedZooms = new Set<PreviewZoom>(["fit", 70, 80, 90, 100]);

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const candidate = value as Partial<AppSettings>;
  return {
    version: 1,
    outputEngine: candidate.outputEngine === "typst" ? "typst" : "html",
    liveSync: typeof candidate.liveSync === "boolean" ? candidate.liveSync : DEFAULT_SETTINGS.liveSync,
    diskBackupEnabled: typeof candidate.diskBackupEnabled === "boolean"
      ? candidate.diskBackupEnabled
      : DEFAULT_SETTINGS.diskBackupEnabled,
    syncDelayMs: allowedSyncDelays.has(candidate.syncDelayMs as SyncDelay)
      ? candidate.syncDelayMs as SyncDelay
      : DEFAULT_SETTINGS.syncDelayMs,
    saveDelayMs: allowedSaveDelays.has(candidate.saveDelayMs as SaveDelay)
      ? candidate.saveDelayMs as SaveDelay
      : DEFAULT_SETTINGS.saveDelayMs,
    showOverflowWarning: typeof candidate.showOverflowWarning === "boolean"
      ? candidate.showOverflowWarning
      : DEFAULT_SETTINGS.showOverflowWarning,
    previewZoom: allowedZooms.has(candidate.previewZoom as PreviewZoom)
      ? candidate.previewZoom as PreviewZoom
      : DEFAULT_SETTINGS.previewZoom,
    previewOpen: typeof candidate.previewOpen === "boolean"
      ? candidate.previewOpen
      : DEFAULT_SETTINGS.previewOpen,
  };
}

export function loadSettings(): AppSettings {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function subscribeToSettings(onChange: (settings: AppSettings) => void) {
  const listener = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      onChange(normalizeSettings(JSON.parse(event.newValue)));
    } catch {
      // Ignore malformed changes from another extension page.
    }
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
