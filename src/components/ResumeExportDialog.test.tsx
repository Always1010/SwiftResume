// @vitest-environment jsdom
import { act, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { createDefaultResume, createResumeFromTemplate, type ResumeDocument } from "../model/resume";
import { ResumeExportDialog } from "./ResumeExportDialog";

vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("./PdfExportDialog", () => ({ PdfExportDialog: ({ checks }: { checks?: ReactNode }) => <div>{checks}<button data-testid="typst-export">下载 PDF</button></div> }));
const previewState = vi.hoisted(() => ({ ready: true }));
vi.mock("./ResumePreview", () => ({ ResumePreview: ({ resume, onPageCountChange, onReadyChange }: { resume: { title: string }; onPageCountChange: (count: number) => void; onReadyChange: (ready: boolean) => void }) => {
  useEffect(() => { onPageCountChange(2); onReadyChange(previewState.ready); }, [onPageCountChange, onReadyChange]);
  return <div data-testid="html-export"><div className="html-resume-pages"><div className="resume-page html-resume">{resume.title}</div><div className="resume-page html-resume">第二页 a  b</div></div></div>;
} }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; previewState.ready = true; vi.restoreAllMocks(); });
async function render(engine: "html" | "typst", resume: ResumeDocument = createDefaultResume()) {
  const close = vi.fn();
  document.body.innerHTML = '<div id="test"></div>';
  root = createRoot(document.getElementById("test")!);
  await act(async () => root.render(<ResumeExportDialog engine={engine} resume={resume} onClose={close} />));
  return { resume, close };
}
function printButton() { return [...document.querySelectorAll("button")].find((button) => button.textContent === "打印 / 保存 PDF")!; }
it("prints the prepared pages in place, keeps the dialog for retry and never opens a tab", async () => {
  const open = vi.spyOn(window, "open");
  const originalTitle = document.title;
  const print = vi.spyOn(window, "print").mockImplementation(() => {
    expect(document.querySelectorAll(".resume-print-root .resume-page")).toHaveLength(2);
    expect(document.querySelector(".resume-print-root")?.textContent).toContain("a  b");
    expect(document.body.classList.contains("swift-resume-printing")).toBe(true);
    window.dispatchEvent(new Event("afterprint"));
  });
  const { close } = await render("html");
  expect(print).not.toHaveBeenCalled();
  act(() => printButton().click());
  act(() => printButton().click());
  expect(print).toHaveBeenCalledTimes(2);
  expect(open).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(document.querySelector(".resume-print-root")).toBeNull();
  expect(document.body.classList.contains("swift-resume-printing")).toBe(false);
  expect(document.title).toBe(originalTitle);
  expect(document.querySelector("a[target]")).toBeNull();
  expect(document.body.textContent).toContain("无法确认文件是否保存");
});
it("preserves the Typst exporter when selected", async () => {
  await render("typst");
  expect(document.querySelector("[data-testid=typst-export]")).not.toBeNull();
  expect(document.querySelector("[data-testid=html-export]")).toBeNull();
});
it("waits for final pagination even when previous pages remain visible", async () => {
  previewState.ready = false;
  await render("html");
  expect(printButton().disabled).toBe(true);
});
it.each(["html", "typst"] as const)("opens %s export directly for incomplete, unusual and sample content", async (engine) => {
  const resume = createResumeFromTemplate("experienced", false);
  resume.profile.name = "";
  resume.profile.phone = "";
  resume.profile.email = "invalid";
  const before = JSON.stringify(resume);
  await render(engine, resume);
  expect(document.querySelector(`[data-testid=${engine}-export]`)).not.toBeNull();
  expect(document.querySelector(".export-content-checks, .pdf-page-checks")).toBeNull();
  expect(document.body.textContent).not.toMatch(/待检查|内容检查|请确认后|定位修改|尚未填写|邮箱格式|还没有内容|本次忽略/);
  if (engine === "html") expect(printButton().disabled).toBe(false);
  expect(JSON.stringify(resume)).toBe(before);

  await act(async () => root.render(<ResumeExportDialog engine={engine} resume={createDefaultResume()} onClose={() => {}} />));
  expect(document.body.textContent).not.toMatch(/内容检查|疑似|可能含有示例|写作建议|过长段落/);
});
it("cleans up a failed native print and allows another attempt", async () => {
  const print = vi.spyOn(window, "print").mockImplementationOnce(() => { throw new Error("print unavailable"); }).mockImplementation(() => {});
  await render("html");
  act(() => printButton().click());
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("print unavailable");
  expect(document.querySelector(".resume-print-root")).toBeNull();
  act(() => printButton().click());
  expect(print).toHaveBeenCalledTimes(2);
  expect(document.querySelector('[role="alert"]')).toBeNull();
});
