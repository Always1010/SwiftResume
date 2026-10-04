// @vitest-environment jsdom
import { act, useState } from "react";
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
vi.mock("./components/NewResumeDialog", () => ({
  NewResumeDialog: ({ onSelect, onClose }: { onSelect: (template: ResumeCreationTemplate) => void; onClose: () => void }) => <div role="dialog" data-testid="new-resume"><button onClick={() => onSelect("blank")}>创建第一份简历</button><button onClick={onClose}>取消新建</button></div>,
}));
vi.mock("./components/ResumeExportDialog", () => ({ ResumeExportDialog: ({ resume, onClose }: { resume: ResumeDocument; onClose: () => void }) => <div role="dialog" data-testid="export"><span>{resume.profile.name}</span><button onClick={onClose}>取消导出</button></div> }));
vi.mock("./components/StandalonePreview", () => ({ StandalonePreview: ({ resume, onBack, onAppearanceChange, onExport }: { resume: ResumeDocument; onBack: () => void; onAppearanceChange: (change: { theme: { templateId: "minimal" } }) => void; onExport: () => void }) => {
  const [filter, setFilter] = useState("");
  return <section data-testid="template-screen"><span>{resume.profile.name}</span><input aria-label="测试模板筛选" value={filter} onChange={(event) => setFilter(event.target.value)} /><button onClick={() => onAppearanceChange({ theme: { templateId: "minimal" } })}>选择模板</button><button onClick={onExport}>预览内导出</button><button onClick={onBack}>返回编辑</button></section>;
} }));
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
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
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
  // JSDOM has no native top layer; use the real Modal component and stub only
  // the browser primitive so the app-to-dialog event path is exercised.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
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
  it.each([true, false])("keeps the editor, selection, position and undo through directory toggles with preview=%s", async (previewOpen) => {
    localStorage.setItem("swift-resume:settings", JSON.stringify({ previewOpen }));
    await mount();
    await act(async () => document.getElementById("resume-block-profile")!.click());
    const field = document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!;
    const original = field.value;
    type(field, "Keep this edit");
    field.setSelectionRange(5, 9);
    const editor = document.querySelector<HTMLElement>(".resume-editor-scroller")!;
    act(() => { editor.scrollTop = 321; editor.dispatchEvent(new Event("scroll", { bubbles: true })); });
    const toggle = button("简历模块");
    act(() => toggle.focus());
    for (let repeat = 0; repeat < 3; repeat++) {
      await click("简历模块");
      const workspace = document.querySelector(".workspace")!;
      expect(workspace.classList.contains("modules-open")).toBe(true);
      expect(document.querySelector(".sidebar")?.parentElement).toBe(workspace);
      expect(editor.parentElement).toBe(workspace);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(toggle.getAttribute("aria-controls")).toBe("resume-modules");
      expect(document.querySelector("#resume-block-profile .field input")).toBe(field);
      expect(field.value).toBe("Keep this edit");
      await click("收起模块");
      expect(workspace.classList.contains("modules-hidden")).toBe(true);
      expect(document.querySelector(".sidebar")).toBeNull();
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(toggle);
      expect(field.selectionStart).toBe(5);
      expect(field.selectionEnd).toBe(9);
      expect(editor.scrollTop).toBe(321);
    }
    expect(scrollTo).not.toHaveBeenCalled();
    expect(button("撤销修改").disabled).toBe(false);
    await click("撤销修改");
    await act(async () => document.getElementById("resume-block-profile")!.click());
    expect(document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!.value).toBe(original);
  });

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
    await click("添加模块");
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

function type(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function pop(view: "editor" | "preview") {
  await act(async () => {
    window.history.replaceState({ swiftResumeView: view }, "", view === "preview" ? "/?view=preview&resumeId=resume-1" : "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}
describe("single-tab stateful screens", () => {
  it("keeps immediate input, editor identity, position and undo across template and export navigation", async () => {
    const open = vi.spyOn(window, "open");
    await mount();
    await act(async () => document.getElementById("resume-block-profile")!.click());
    const field = document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!;
    act(() => field.focus());
    type(field, "Lin Xiao immediate");
    field.setSelectionRange(4, 8);
    const editor = document.querySelector<HTMLElement>(".resume-editor-scroller")!;
    act(() => { editor.scrollTop = 321; editor.dispatchEvent(new Event("scroll", { bubbles: true })); });
    await click("模板与预览");
    expect(document.querySelector(".app-shell")?.hasAttribute("hidden")).toBe(true);
    expect(document.querySelector('[data-testid="template-screen"]')?.textContent).toContain("Lin Xiao immediate");
    expect(document.querySelector("#resume-block-profile .field input")).toBe(field);
    type(document.querySelector<HTMLInputElement>('[aria-label="测试模板筛选"]')!, "极简");
    await click("选择模板");
    await click("预览内导出");
    expect(document.querySelector('[data-testid="export"]')?.textContent).toContain("Lin Xiao immediate");
    await click("取消导出");
    await pop("editor");
    expect(document.querySelector("#resume-block-profile .field input")).toBe(field);
    expect(field.value).toBe("Lin Xiao immediate");
    expect(editor.scrollTop).toBe(321);
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(4);
    expect(field.selectionEnd).toBe(8);
    expect(button("撤销修改").disabled).toBe(false);
    expect(button("撤销修改").getAttribute("aria-label")).toContain("调整简历样式");
    await pop("preview");
    expect(document.querySelector<HTMLInputElement>('[aria-label="测试模板筛选"]')!.value).toBe("极简");
    expect(open).not.toHaveBeenCalled();
  });
  it("recovers immediate edits and open module after refresh before the debounce elapses", async () => {
    await mount();
    await act(async () => document.getElementById("resume-block-profile")!.click());
    type(document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!, "Refresh recovery");
    act(() => root!.unmount()); root = undefined;
    document.body.innerHTML = "";
    await mount();
    expect(document.querySelector<HTMLInputElement>("#resume-block-profile .field input")?.value).toBe("Refresh recovery");
    expect(document.querySelector("#resume-block-profile.editing")).not.toBeNull();
  });
  it("does not expose removed job-version controls", async () => {
    await mount();
    expect(document.body.textContent).not.toContain("岗位版本");
  });
});

it("returns from cancelled creation to the same library search, then creates directly into editing", async () => {
  await mount();
  await act(async () => document.getElementById("resume-block-profile")!.click());
  expect(document.querySelector("#resume-block-profile.editing")).not.toBeNull();
  await act(async () => document.querySelector<HTMLButtonElement>(".document-switcher")!.click());
  type(document.querySelector<HTMLInputElement>('[aria-label="搜索简历"]')!, "未命名");
  await click("新建简历");
  await click("取消新建");
  expect(document.querySelector<HTMLInputElement>('[aria-label="搜索简历"]')!.value).toBe("未命名");
  await click("新建简历"); await click("创建第一份简历"); await flushNavigation();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.querySelector("#resume-block-profile.editing")).not.toBeNull();
  expect(document.activeElement).toBe(document.querySelector("#resume-block-profile .field input"));
});

it("opens My resumes through the visible title button and preserves the active editor when closed", async () => {
  const openWindow = vi.spyOn(window, "open");
  await mount();
  await act(async () => document.getElementById("resume-block-profile")!.click());
  const field = document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!;
  type(field, "QA entry check");
  const entry = document.querySelector<HTMLButtonElement>(".document-switcher")!;
  expect(entry.tagName).toBe("BUTTON"); expect(entry.disabled).toBe(false);
  expect(entry.getAttribute("aria-haspopup")).toBe("dialog");
  expect(entry.getAttribute("aria-label")).toBe("我的简历");
  expect(entry.getAttribute("data-testid")).toBe("resume-library-trigger");
  expect(document.getElementById(entry.getAttribute("aria-describedby")!)?.textContent).toBe(resume.title);
  expect(entry.getAttribute("aria-expanded")).toBe("false");
  entry.focus();
  await act(async () => entry.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  expect(entry.getAttribute("aria-expanded")).toBe("true");
  const dialog = document.getElementById(entry.getAttribute("aria-controls")!) as HTMLDialogElement;
  expect(dialog).toBeInstanceOf(HTMLDialogElement);
  expect(dialog.open).toBe(true);
  expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
  expect(document.getElementById("resume-library-title")?.textContent).toBe("我的简历");
  expect(document.querySelectorAll(".library-row")).toHaveLength(1);
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="关闭我的简历"]')!.click());
  expect(document.getElementById("resume-library-title")).toBeNull();
  expect(entry.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(entry);
  expect(document.querySelector("#resume-block-profile .field input")).toBe(field);
  expect(field.value).toBe("QA entry check");
  expect(openWindow).not.toHaveBeenCalled();
  // A second opening must mount another native modal and Escape must dismiss it.
  await act(async () => entry.click());
  expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(2);
  const cancel = new Event("cancel", { cancelable: true });
  await act(async () => document.querySelector("dialog")!.dispatchEvent(cancel));
  expect(cancel.defaultPrevented).toBe(true);
  expect(entry.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(entry);
});

it("separates editing context from the finished preview without replacing the editor", async () => {
  await mount();
  expect(document.querySelector(".resume-editor-heading h2")?.textContent).toBe("编辑内容");
  expect(document.querySelector(".preview-toolbar h2")?.textContent).toBe("成品预览");
  expect(document.querySelector(".resume-editor-heading")?.textContent).toContain("点击想修改的内容");
  await act(async () => document.getElementById("resume-block-profile")!.click());
  expect(document.querySelector(".resume-editor-heading")?.textContent).toContain("正在编辑 · 个人信息");
  const editor = document.querySelector(".resume-editor-scroller");
  await click("收起预览");
  expect(document.querySelector(".preview-panel")).toBeNull();
  expect(document.querySelector(".resume-editor-scroller")).toBe(editor);
  await click("显示预览");
  expect(document.querySelector(".preview-toolbar h2")?.textContent).toBe("成品预览");
  expect(document.querySelector(".resume-editor-scroller")).toBe(editor);
});

it("places modules and history before preview actions without a misleading tab switch", async () => {
  await mount();
  const controls = document.querySelector(".workspace-controls")!;
  expect(controls.querySelector(".workspace-mode-switch, [role='tab'], [aria-current]")).toBeNull();
  const left = controls.firstElementChild!;
  const right = controls.lastElementChild!;
  expect(left.className).toBe("workspace-edit-tools");
  expect(left.textContent).toContain("简历模块");
  expect(left.textContent).toContain("撤销修改");
  expect(right.className).toBe("workspace-preview-tools");
  expect(right.lastElementChild?.getAttribute("aria-label")).toBe("打开模板与预览");
  await click("简历模块");
  expect(left.querySelector("button")?.getAttribute("aria-controls")).toBe(document.querySelector(".sidebar")?.id);
  await click("收起模块");
  expect(left.querySelector("button")?.getAttribute("aria-expanded")).toBe("false");
});

it("keeps typing undo native and wires document undo/redo to the displayed shortcuts", async () => {
  await mount();
  await act(async () => document.getElementById("resume-block-profile")!.click());
  const field = document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!;
  const original = field.value;
  type(field, "Document shortcut edit");
  const nativeUndo = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true });
  act(() => { field.dispatchEvent(nativeUndo); });
  expect(nativeUndo.defaultPrevented).toBe(false);
  expect(field.value).toBe("Document shortcut edit");
  const undo = new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, altKey: true, bubbles: true, cancelable: true });
  act(() => { field.dispatchEvent(undo); });
  expect(undo.defaultPrevented).toBe(true);
  expect(button("恢复修改").disabled).toBe(false);
  expect(button("撤销修改").disabled).toBe(true);
  act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, altKey: true, shiftKey: true, cancelable: true })));
  expect(button("恢复修改").disabled).toBe(true);
  await act(async () => document.getElementById("resume-block-profile")!.click());
  expect(document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!.value).toBe("Document shortcut edit");
  expect(original).not.toBe("Document shortcut edit");
});
