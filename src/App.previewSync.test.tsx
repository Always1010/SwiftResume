// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { createBlankResume, createQuickSection, type ResumeDocument } from "./model/resume";
import { createResumeSummary, type ResumeLibrary } from "./storage/resumeStorage";

const stored = vi.hoisted(() => ({ documents: new Map<string, ResumeDocument>(), library: null as ResumeLibrary | null }));
vi.mock("./storage/resumeStorage", async (original) => ({
  ...await original<typeof import("./storage/resumeStorage")>(),
  loadResumeWorkspace: vi.fn(async () => ({ library: structuredClone(stored.library), resume: structuredClone(stored.documents.get(stored.library!.activeResumeId)) })),
  loadResumeById: vi.fn(async (id: string) => structuredClone(stored.documents.get(id) ?? null)),
  saveResumeWorkspace: vi.fn(async (id: string, resume: ResumeDocument, library: ResumeLibrary) => {
    stored.documents.set(id, structuredClone(resume)); stored.library = structuredClone(library);
  }),
  activateResume: vi.fn(async (library: ResumeLibrary, id: string) => { stored.library = { ...library, activeResumeId: id }; return stored.library; }),
}));
vi.mock("./storage/diskBackup", () => ({ isDiskBackupSupported: () => false }));
vi.mock("./sync/resumeSync", () => ({ useResumeSync: () => ({ supported: true }) }));
vi.mock("./sync/previewSync", () => ({ usePreviewPublisher: () => undefined }));
vi.mock("./components/customEditors/ContentBodyEditor", () => ({ ContentBodyEditor: () => null }));
vi.mock("./components/ResumeExportDialog", () => ({ ResumeExportDialog: ({ resume, onClose }: { resume: ResumeDocument; onClose: () => void }) => <div data-testid="export-document">{resume.title}:{resume.profile.name}:{resume.theme.templateId}<button onClick={onClose}>关闭测试导出</button></div> }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;

function doc(title: string, name: string) {
  const resume = createBlankResume(); resume.title = title; resume.profile.name = name;
  resume.sections = [createQuickSection("work")];
  if (resume.sections[0].type === "content") resume.sections[0].entries[0].title = `${title} 独立经历`;
  return resume;
}
function button(label: string) {
  const result = [...document.querySelectorAll<HTMLButtonElement>("button")].find((node) => node.getAttribute("aria-label") === label || node.textContent?.trim() === label);
  if (!result) throw new Error(`Missing button: ${label}`); return result;
}
async function click(label: string) { await act(async () => { button(label).click(); }); }
async function frames() { await act(async () => { vi.advanceTimersByTime(40); }); }
async function mount() {
  await import("./components/HtmlPrintPreview");
  const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(<App />); });
  await frames();
}
async function view(mode: "editor" | "preview", id = "A") {
  await act(async () => {
    window.history.replaceState({ swiftResumeView: mode }, "", mode === "preview" ? `/?view=preview&resumeId=${id}` : "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await frames();
}
async function editName(name: string) {
  await act(async () => { document.getElementById("resume-block-profile")!.click(); });
  const input = document.querySelector<HTMLInputElement>("#resume-block-profile .field input")!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, name); input.dispatchEvent(new Event("input", { bubbles: true })); });
  return input;
}
const templatePaper = () => document.querySelector(".standalone-preview-viewport .html-resume-pages")!;
const editorPaper = () => document.querySelector(".preview-panel .html-resume-pages")!;

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  stored.documents = new Map([["A", doc("Synthetic A", "Alice QA")], ["B", doc("Synthetic B", "Bob QA")]]);
  stored.library = { version: 1, activeResumeId: "A", resumes: [...stored.documents].map(([id, resume]) => createResumeSummary(id, resume)) };
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1188 });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  Object.defineProperty(document, "fonts", { configurable: true, value: { load: vi.fn(async () => []), ready: Promise.resolve() } });
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn(async () => undefined) });
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
  // JSDOM has no layout. Model the browser's zero geometry below hidden screens,
  // but use the REAL pagination algorithm, rendered content and page commit code.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const width = this.closest("[hidden]") ? 0 : 794, height = width ? 100 : 0;
    return { x: 0, y: 0, top: 0, left: 0, bottom: height, right: width, width, height, toJSON: () => ({}) };
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) { return this.closest("[hidden]") ? 0 : 1123; });
  const originalStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = originalStyle(element);
    if (element.classList.contains("html-resume")) return new Proxy(style, { get: (target, key) => key === "width" ? "794px" : key === "paddingTop" || key === "paddingBottom" ? "40px" : Reflect.get(target, key) });
    return style;
  });
});
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("repaginates current content after editing while the template screen is hidden, preserving editor and undo", async () => {
  await mount(); await click("打开模板与预览"); await frames();
  expect(templatePaper().textContent).toContain("Alice QA");
  await view("editor"); const input = await editName("Alice immediate revision");
  await frames(); // hidden preview must not try to measure display:none
  await click("打开模板与预览"); await frames();
  expect(templatePaper().textContent).toContain("Alice immediate revision");
  expect(templatePaper().textContent).not.toContain("Alice QA");
  expect(document.querySelector("#resume-block-profile .field input")).toBe(input);
  await click("预览极简留白模板"); await frames();
  await view("editor");
  expect(editorPaper().querySelector<HTMLElement>(".resume-page")?.dataset.template).toBe("minimal");
  expect(editorPaper().textContent).toContain("Alice immediate revision");
  expect(button("撤销修改").disabled).toBe(false);
});

it("switches A to B before save debounce and uses B for preview, template application and export only", async () => {
  await mount(); await click("打开模板与预览"); await frames(); await view("editor");
  await editName("Alice saved independently");
  await click("我的简历"); await click("打开编辑：Synthetic B");
  await editName("Bob immediate revision"); await frames();
  await click("打开模板与预览"); await frames();
  expect(templatePaper().textContent).toContain("Bob immediate revision");
  expect(templatePaper().textContent).toContain("Synthetic B 独立经历");
  expect(templatePaper().textContent).not.toContain("Alice");
  await click("预览极简留白模板"); await frames();
  await act(async () => { document.querySelector<HTMLButtonElement>(".standalone-preview-actions .primary-button")!.click(); });
  expect(document.querySelector('[data-testid="export-document"]')?.textContent).toContain("Synthetic B:Bob immediate revision:minimal");
  await frames(); await act(async () => { vi.advanceTimersByTime(1000); });
  expect(stored.documents.get("A")?.profile.name).toBe("Alice saved independently");
  expect(stored.documents.get("A")?.theme.templateId).not.toBe("minimal");
  expect(stored.documents.get("B")?.theme.templateId).toBe("minimal");
});

it("loads the explicitly named legacy preview document and updates it after returning to edit", async () => {
  window.history.replaceState({}, "", "/?view=preview&resumeId=B");
  await mount(); expect(templatePaper().textContent).toContain("Bob QA");
  await view("editor", "B"); await editName("Legacy B revised"); await frames();
  await click("打开模板与预览"); await frames();
  expect(templatePaper().textContent).toContain("Legacy B revised");
  expect(new URLSearchParams(window.location.search).get("resumeId")).toBe("B");
  expect(stored.documents.get("A")?.profile.name).toBe("Alice QA");
});

it("keeps a duplicate independent and refreshes the already-visited template screen", async () => {
  await mount(); await click("打开模板与预览"); await frames(); await view("editor");
  await click("我的简历"); await click("创建副本：Synthetic A");
  const copiedId = stored.library!.activeResumeId;
  expect(copiedId).not.toBe("A");
  await editName("Copy independent content"); await frames();
  await click("打开模板与预览"); await frames();
  expect(templatePaper().textContent).toContain("Copy independent content");
  expect(new URLSearchParams(window.location.search).get("resumeId")).toBe(copiedId);
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(stored.documents.get("A")?.profile.name).toBe("Alice QA");
  expect(stored.documents.get("B")?.profile.name).toBe("Bob QA");
  expect(stored.documents.get(copiedId)?.profile.name).toBe("Copy independent content");
});

it("shows newly created content rather than the previously visited template document", async () => {
  await mount(); await click("打开模板与预览"); await frames(); await view("editor");
  await click("我的简历"); await click("新建简历");
  await click("创建并编辑");
  const createdId = stored.library!.activeResumeId;
  expect(createdId).not.toBe("A");
  await editName("New independent content"); await frames();
  await click("打开模板与预览"); await frames();
  expect(templatePaper().textContent).toContain("New independent content");
  expect(templatePaper().textContent).not.toContain("Synthetic A 独立经历");
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(stored.documents.get("A")?.profile.name).toBe("Alice QA");
  expect(stored.documents.get("B")?.profile.name).toBe("Bob QA");
  expect(stored.documents.get(createdId)?.profile.name).toBe("New independent content");
});

it("cancels a pending layout on hide and measures only the latest content after reopening", async () => {
  await mount(); await click("打开模板与预览"); // leave the first frame pending
  await act(async () => { window.history.replaceState({}, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await editName("Latest after interrupted preview"); await frames();
  expect(templatePaper().textContent).not.toContain("Latest after interrupted preview");
  await click("打开模板与预览"); await frames();
  expect(templatePaper().textContent).toContain("Latest after interrupted preview");
  expect(document.querySelector(".standalone-preview-viewport [role=alert]")).toBeNull();
});
