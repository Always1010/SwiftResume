// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createBlankResume, createQuickSection, type ResumeCreationTemplate, type ResumeDocument } from "./model/resume";
import { createResumeSummary, loadResumeWorkspace } from "./storage/resumeStorage";
import { loadBackupDirectory, queryBackupPermission } from "./storage/diskBackup";

vi.mock("./components/ResumePreview", () => ({
  ResumePreview: () => <div>成品预览</div>,
  ResumeProfileView: () => <span>个人信息预览</span>,
  ResumeSectionView: () => <span>模块预览</span>,
}));
vi.mock("./components/customEditors/ContentBodyEditor", () => ({
  ContentBodyEditor: () => <div className="content-rich-surface"><div contentEditable tabIndex={0} aria-label="正文" /></div>,
}));
vi.mock("./components/Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div> }));
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
  isDiskBackupSupported: () => true,
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
async function flushNavigation() { await act(async () => { vi.advanceTimersByTime(40); }); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  resume = createBlankResume();
  const work = createQuickSection("work");
  work.id = "work-1";
  resume.sections = [work];
  vi.mocked(loadResumeWorkspace).mockResolvedValue(workspace());
  vi.mocked(loadBackupDirectory).mockResolvedValue(null);
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

describe("workspace module navigation", () => {
  it("closes the desktop directory, positions the module heading and focuses its first content field", async () => {
    await mount();
    await click("简历模块");
    await click("⋮⋮工作经历");
    await flushNavigation();
    expect(document.querySelector(".sidebar")).toBeNull();
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 484, behavior: "instant" });
    expect(document.activeElement).toBe(document.querySelector("#resume-block-work-1 .field input"));
    expect(document.activeElement).not.toBe(document.querySelector("#resume-block-work-1 .section-title-input"));
    // Selecting the same editor again still moves to the beginning and focuses it.
    await click("简历模块");
    await click("⋮⋮工作经历");
    await flushNavigation();
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it("adds a summary and focuses the visible body after the dialog and directory close", async () => {
    await mount();
    await click("简历模块");
    await click("＋ 添加模块");
    const summaryChoice = document.querySelector<HTMLButtonElement>('.module-picker-options button:nth-child(5)')!;
    await act(async () => { summaryChoice.click(); });
    await click("添加并编辑");
    await flushNavigation();
    expect(document.querySelector(".sidebar")).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("正文");
    expect(scrollTo).toHaveBeenCalledOnce();
  });

  it("opens and focuses a newly copied visible module after state updates", async () => {
    await mount();
    await click("简历模块");
    await act(async () => { document.querySelector<HTMLButtonElement>('[title="复制模块"]')!.click(); });
    await flushNavigation();
    expect(document.querySelector(".sidebar")).toBeNull();
    expect(document.querySelectorAll(".section-block")).toHaveLength(2);
    expect(document.activeElement).toBe(document.querySelector(".section-block.editing .field input"));
    expect(document.activeElement?.closest(".section-block")?.id).not.toBe("resume-block-work-1");
  });

  it("focuses the visible summary body instead of preserved fields in a closed disclosure", async () => {
    const summary = createQuickSection("summary");
    if (summary.type !== "content") throw new Error("Expected a content section");
    summary.entries[0].title = "保留的旧标题";
    resume.sections = [summary];
    await mount();
    await click("简历模块");
    await click("⋮⋮个人简介");
    await flushNavigation();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("正文");
    expect(document.querySelector(".content-entry-editor details")?.hasAttribute("open")).toBe(false);
  });

  it("keeps hidden module controls accessible rather than closing an absent canvas target", async () => {
    resume.sections[0].enabled = false;
    await mount();
    await click("简历模块");
    await click("⋮⋮工作经历已隐藏");
    await flushNavigation();
    expect(document.querySelector(".sidebar")).not.toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => { document.querySelector<HTMLButtonElement>('[title="复制模块"]')!.click(); });
    await flushNavigation();
    expect(document.querySelector(".sidebar")).not.toBeNull();
    expect(document.querySelectorAll(".module-row.disabled")).toHaveLength(2);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("cancels stale navigation when the user selects another module before layout settles", async () => {
    await mount();
    await click("简历模块");
    await click("⋮⋮工作经历");
    await click("简历模块");
    const profile = document.querySelector<HTMLButtonElement>(".profile-row")!;
    await act(async () => { profile.click(); });
    await flushNavigation();
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(document.querySelector("#resume-block-profile .field input"));
  });
  it("does not steal focus back when the user opens another canvas editor", async () => {
    await mount();
    await click("简历模块");
    await click("⋮⋮工作经历");
    await act(async () => { document.querySelector<HTMLElement>("#resume-block-profile")!.click(); });
    await flushNavigation();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.querySelector("#resume-block-profile")?.classList.contains("editing")).toBe(true);
  });

});
