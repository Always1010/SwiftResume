// @vitest-environment jsdom
import { act, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { createDefaultResume } from "../model/resume";
import { savePrintJob } from "../export/htmlPrintJobs";
import { ResumeExportDialog } from "./ResumeExportDialog";

vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("./PdfExportDialog", () => ({ PdfExportDialog: () => <button data-testid="typst-export">下载 PDF</button> }));
const previewState = vi.hoisted(() => ({ ready: true }));
vi.mock("./ResumePreview", () => ({ ResumePreview: ({ onPageCountChange, onReadyChange }: { onPageCountChange: (count: number) => void; onReadyChange: (ready: boolean) => void }) => {
  useEffect(() => { onPageCountChange(2); onReadyChange(previewState.ready); }, [onPageCountChange, onReadyChange]);
  return <div data-testid="html-export" />;
} }));
vi.mock("../export/htmlPrintJobs", () => ({ savePrintJob: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; previewState.ready = true; vi.clearAllMocks(); });

async function render(engine: "html" | "typst") {
  const resume = createDefaultResume();
  const requested = vi.fn();
  document.body.innerHTML = '<div id="test"></div>';
  root = createRoot(document.getElementById("test")!);
  await act(async () => root.render(<ResumeExportDialog engine={engine} resume={resume} onClose={() => {}} />));
  return { resume, requested };
}
it("prepares HTML through an isolated snapshot link without recording a request yet", async () => {
  vi.mocked(savePrintJob).mockResolvedValue("https://example.test/?view=html-print&job=one");
  const { resume, requested } = await render("html");
  expect(savePrintJob).toHaveBeenCalledWith(expect.any(String), resume);
  const link = document.querySelector("a")!;
  expect(link.href).toContain("job=one");
  expect(link.target).toBe("_blank");
  expect(link.rel).toBe("noopener noreferrer");
  expect(document.querySelector("[data-testid=html-export]")).not.toBeNull();
  expect(document.querySelector("[data-testid=typst-export]")).toBeNull();
  expect(requested).not.toHaveBeenCalled();
});
it("preserves the Typst exporter when selected", async () => {
  const { requested } = await render("typst");
  const button = document.querySelector<HTMLButtonElement>("[data-testid=typst-export]")!;
  expect(button).not.toBeNull();
  act(() => button.click());
  expect(requested).not.toHaveBeenCalled();
  expect(savePrintJob).not.toHaveBeenCalled();
});
it("waits for final pagination even when previous pages remain visible", async () => {
  previewState.ready = false;
  vi.mocked(savePrintJob).mockResolvedValue("https://example.test/?view=html-print&job=pending");
  await render("html");
  expect(document.querySelector("[data-testid=html-export]")).not.toBeNull();
  expect(document.querySelector("a")).toBeNull();
});
it("does not offer a print link when saving the snapshot fails", async () => {
  vi.mocked(savePrintJob).mockRejectedValue(new Error("quota"));
  await render("html");
  expect(document.querySelector("[role=alert]")?.textContent).toContain("无法准备打印快照");
  expect(document.querySelector("a")).toBeNull();
});

it("keeps content warnings and their editing destinations in the same export dialog", async () => {
  vi.mocked(savePrintJob).mockResolvedValue("https://example.test/?view=html-print&job=one");
  const { resume } = await render("html");
  resume.profile.email = "invalid";
  const locate = vi.fn();
  await act(async () => root.render(<ResumeExportDialog engine="html" resume={resume} onClose={() => {}} onLocate={locate} />));
  expect(document.querySelector(".export-content-checks summary")?.textContent).toContain("项内容待检查");
  const button = [...document.querySelectorAll("button")].find((item) => item.textContent === "定位修改")!;
  act(() => button.click());
  expect(locate).toHaveBeenCalledWith("profile");
});
it("does not record a request on close, pending pagination or failed snapshot preparation", async () => {
  previewState.ready = false;
  vi.mocked(savePrintJob).mockResolvedValue("https://example.test/?view=html-print&job=pending");
  const { requested } = await render("html");
  act(() => [...document.querySelectorAll("button")].find((button) => button.textContent === "返回编辑")!.click());
  expect(requested).not.toHaveBeenCalled();
});

it("ignores a stale snapshot preparation after the resume changes", async () => {
  let resolveOld!: (url: string) => void;
  vi.mocked(savePrintJob).mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
  const { requested } = await render("html");
  const next = createDefaultResume();
  next.title = "New snapshot";
  vi.mocked(savePrintJob).mockResolvedValueOnce("https://example.test/?view=html-print&job=new");
  await act(async () => root.render(<ResumeExportDialog engine="html" resume={next} onClose={() => {}} />));
  await act(async () => resolveOld("https://example.test/?view=html-print&job=old"));
  expect(document.querySelector("a")?.href).toContain("job=new");
  expect(requested).not.toHaveBeenCalled();
});
