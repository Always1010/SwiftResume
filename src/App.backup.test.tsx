// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createBlankResume, createQuickSection, type ResumeCreationTemplate, type ResumeDocument } from "./model/resume";
import { createResumeSummary, loadResumeWorkspace } from "./storage/resumeStorage";
import { backupResumeToDirectory, chooseBackupDirectory, isDiskBackupSupported, loadBackupDirectory, queryBackupPermission, requestBackupPermission } from "./storage/diskBackup";
import { DEFAULT_SETTINGS } from "./settings/appSettings";

vi.mock("./components/ResumePreview", () => ({
  ResumePreview: () => <div>成品预览</div>,
  ResumeProfileView: () => <span>个人信息预览</span>,
  ResumeSectionView: () => <span>模块预览</span>,
}));
vi.mock("./components/customEditors/ContentBodyEditor", () => ({
  ContentBodyEditor: () => <div className="content-rich-surface"><div contentEditable tabIndex={0} aria-label="正文" /></div>,
}));
vi.mock("./components/Modal", () => ({ Modal: ({ children, className }: { children: ReactNode; className?: string }) => <div role="dialog" className={className}>{children}</div> }));
vi.mock("./components/NewResumeDialog", () => ({
  NewResumeDialog: ({ onSelect }: { onSelect: (template: ResumeCreationTemplate) => void }) => <div role="dialog"><button onClick={() => onSelect("blank")}>创建第一份简历</button></div>,
}));
vi.mock("./components/ResumeExportDialog", () => ({ ResumeExportDialog: () => null }));
vi.mock("./components/HistoryPanel", () => ({ HistoryPanel: () => null }));
vi.mock("./sync/resumeSync", () => ({ useResumeSync: () => ({ supported: true }) }));
vi.mock("./sync/previewSync", () => ({ usePreviewPublisher: () => undefined }));
vi.mock("./storage/resumeStorage", async (importOriginal) => ({
  ...await importOriginal<typeof import("./storage/resumeStorage")>(),
  loadResumeWorkspace: vi.fn(),
  saveResumeWorkspace: vi.fn(async () => undefined),
}));
vi.mock("./storage/diskBackup", async (importOriginal) => ({
  ...await importOriginal<typeof import("./storage/diskBackup")>(),
  isDiskBackupSupported: vi.fn(() => true),
  chooseBackupDirectory: vi.fn(async () => { throw new DOMException("Cancelled", "AbortError"); }),
  requestBackupPermission: vi.fn(async () => false),
  loadBackupDirectory: vi.fn(async () => null),
  queryBackupPermission: vi.fn(async () => "granted"),
  backupResumeToDirectory: vi.fn(async () => undefined),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let resume: ResumeDocument;
const scrollTo = vi.fn();

function button(label: string) {
  const result = [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === label);
  if (!result) throw new Error(`找不到按钮：${label}`);
  return result;
}
function workspace(firstRun = false) {
  return { resume, firstRun, library: { version: 1 as const, activeResumeId: "resume-1", resumes: [createResumeSummary("resume-1", resume)] } };
}
async function mount() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root!.render(<App />); });
}
async function click(label: string) { await act(async () => { button(label).click(); }); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  resume = createBlankResume();
  const work = createQuickSection("work");
  work.id = "work-1";
  resume.sections = [work];
  vi.mocked(loadResumeWorkspace).mockResolvedValue(workspace());
  vi.mocked(isDiskBackupSupported).mockReturnValue(true);
  vi.mocked(loadBackupDirectory).mockResolvedValue(null);
  vi.mocked(backupResumeToDirectory).mockResolvedValue(undefined);
  vi.mocked(queryBackupPermission).mockResolvedValue("granted");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1188 });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: scrollTo });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const top = this.classList.contains("resume-editor-scroller") ? 100 : 600;
    return { x: 0, y: top, top, left: 0, bottom: top + 300, right: 500, width: 500, height: 300, toJSON: () => ({}) };
  });
});
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("progressive backup notice", () => {
  it("allows creation first and only dismisses the notice for the current page", async () => {
    vi.mocked(loadResumeWorkspace).mockResolvedValue(workspace(true));
    await mount();
    expect(document.querySelector(".backup-notice")).toBeNull();
    await click("创建第一份简历");
    expect(document.querySelector(".backup-notice")).not.toBeNull();
    expect(document.querySelector('[role="alertdialog"], [aria-modal="true"]')).toBeNull();
    expect(document.querySelector(".backup-notice-details")?.hasAttribute("open")).toBe(false);
    await click("本次稍后");
    expect(document.querySelector(".backup-notice")).toBeNull();
    act(() => root!.unmount());
    root = undefined;
    document.body.innerHTML = "";
    vi.mocked(loadResumeWorkspace).mockResolvedValue(workspace());
    await mount();
    expect(document.querySelector(".backup-notice")).not.toBeNull();
    await click("设置与备份");
    expect(document.querySelector(".settings-page")?.textContent).toContain("清理浏览器数据或卸载扩展可能丢失未备份的简历");
    expect(button("选择目录")).toBeDefined();
    expect(chooseBackupDirectory).not.toHaveBeenCalled();
    expect(requestBackupPermission).not.toHaveBeenCalled();
    expect(backupResumeToDirectory).not.toHaveBeenCalled();
  });

  it("still surfaces a different backup problem after an earlier setup dismissal", async () => {
    localStorage.setItem("swift-resume:backup-notice-dismissed", "not-configured:");
    vi.mocked(loadBackupDirectory).mockResolvedValue({ name: "Resume backups" } as FileSystemDirectoryHandle);
    vi.mocked(queryBackupPermission).mockResolvedValue("prompt");
    await mount();
    expect(document.querySelector(".backup-notice")?.textContent).toContain("磁盘备份待授权");
    expect(button("重新授权")).toBeDefined();
  });
  it.each(["not-configured:", "permission-required:Resume backups", "error:"])("ignores the old permanent dismissal for %s", async (dismissal) => {
    localStorage.setItem("swift-resume:backup-notice-dismissed", dismissal);
    if (dismissal.startsWith("permission-required")) {
      vi.mocked(loadBackupDirectory).mockResolvedValue({ name: "Resume backups" } as FileSystemDirectoryHandle);
      vi.mocked(queryBackupPermission).mockResolvedValue("prompt");
    } else if (dismissal.startsWith("error")) {
      vi.mocked(loadBackupDirectory).mockRejectedValue(new Error("Directory unavailable"));
    }
    await mount();
    expect(document.querySelector(".backup-notice")).not.toBeNull();
    expect(chooseBackupDirectory).not.toHaveBeenCalled();
    expect(requestBackupPermission).not.toHaveBeenCalled();
  });

  it("keeps the reminder after cancelling directory selection without writing a backup", async () => {
    await mount();
    await click("选择备份目录");
    expect(chooseBackupDirectory).toHaveBeenCalledOnce();
    expect(backupResumeToDirectory).not.toHaveBeenCalled();
    expect(document.querySelector(".backup-notice")).not.toBeNull();
  });

  it("keeps the permission reminder until the user grants access", async () => {
    vi.mocked(loadBackupDirectory).mockResolvedValue({ name: "Resume backups" } as FileSystemDirectoryHandle);
    vi.mocked(queryBackupPermission).mockResolvedValue("prompt");
    await mount();
    expect(requestBackupPermission).not.toHaveBeenCalled();
    await click("重新授权");
    expect(requestBackupPermission).toHaveBeenCalledOnce();
    expect(backupResumeToDirectory).not.toHaveBeenCalled();
    expect(document.querySelector(".backup-notice")?.textContent).toContain("磁盘备份待授权");
  });

  it("stays quiet for a directory with valid permission", async () => {
    vi.mocked(loadBackupDirectory).mockResolvedValue({ name: "Resume backups" } as FileSystemDirectoryHandle);
    await mount();
    expect(document.querySelector(".backup-notice")).toBeNull();
    expect(requestBackupPermission).not.toHaveBeenCalled();
  });

  it("surfaces a failed write without claiming that the disk backup succeeded", async () => {
    vi.mocked(loadBackupDirectory).mockResolvedValue({ name: "Resume backups" } as FileSystemDirectoryHandle);
    vi.mocked(backupResumeToDirectory).mockRejectedValue(new Error("Write failed"));
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(document.querySelector(".backup-notice")?.textContent).toContain("最近的修改尚未确认备份到磁盘");
  });

  it("respects an explicitly disabled automatic backup setting", async () => {
    localStorage.setItem("swift-resume:settings", JSON.stringify({ ...DEFAULT_SETTINGS, diskBackupEnabled: false }));
    await mount();
    expect(document.querySelector(".backup-notice")).toBeNull();
    expect(JSON.parse(localStorage.getItem("swift-resume:settings")!).diskBackupEnabled).toBe(false);
  });

  it("does not offer an unavailable directory picker", async () => {
    vi.mocked(isDiskBackupSupported).mockReturnValue(false);
    await mount();
    expect(document.querySelector(".backup-notice")).toBeNull();
    expect(loadBackupDirectory).not.toHaveBeenCalled();
  });

});
