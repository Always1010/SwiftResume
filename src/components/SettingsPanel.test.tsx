// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";
import { loadSettings } from "../settings/appSettings";
vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });
it("keeps every import and backup function in Settings with a named close control", () => {
  const props = { settings: loadSettings(), syncSupported: true, backupSupported: true, backupStatus: "ready" as const, backupDirectoryName: "QA backups", onChange: vi.fn(), onClose: vi.fn(), onChooseBackupDirectory: vi.fn(), onAuthorizeBackupDirectory: vi.fn(), onBackupNow: vi.fn(), onRestoreBackup: vi.fn(), onOpenHistory: vi.fn(), onExportResume: vi.fn(), onExportLibrary: vi.fn(), onImportBackup: vi.fn(), onImportText: vi.fn() };
  document.body.innerHTML = '<div id="test"></div>'; root = createRoot(document.getElementById("test")!);
  act(() => root.render(<SettingsPanel {...props} />));
  for (const [label, callback] of [["粘贴已有简历", props.onImportText], ["导入 JSON 备份", props.onImportBackup], ["备份当前简历", props.onExportResume], ["备份全部简历", props.onExportLibrary], ["历史版本", props.onOpenHistory], ["从目录恢复", props.onRestoreBackup], ["立即备份", props.onBackupNow]] as const) {
    act(() => [...document.querySelectorAll("button")].find((button) => button.textContent === label)!.click());
    expect(callback).toHaveBeenCalledOnce();
  }
  const close = document.querySelector<HTMLButtonElement>('[aria-label="关闭设置"]')!;
  expect(close.title).toBe("关闭设置");
  expect(close.textContent).toBe("×");
  act(() => close.click()); expect(props.onClose).toHaveBeenCalledOnce();
  expect(document.querySelector<HTMLDetailsElement>(".settings-advanced")!.open).toBe(false);
});
