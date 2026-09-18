// @vitest-environment jsdom
import { act, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { createDefaultResume } from "../model/resume";
import { savePrintJob } from "../export/htmlPrintJobs";
import { ResumeExportDialog } from "./ResumeExportDialog";

vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("./PdfExportDialog", () => ({ PdfExportDialog: () => <div data-testid="typst-export" /> }));
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
  const downloaded = vi.fn();
  document.body.innerHTML = '<div id="test"></div>';
  root = createRoot(document.getElementById("test")!);
  await act(async () => root.render(<ResumeExportDialog engine={engine} resume={resume} onClose={() => {}} onDownloaded={downloaded} />));
  return { resume, downloaded };
}
it("exports HTML through an isolated snapshot link without claiming a completed download", async () => {
  vi.mocked(savePrintJob).mockResolvedValue("https://example.test/?view=html-print&job=one");
  const { resume, downloaded } = await render("html");
  expect(savePrintJob).toHaveBeenCalledWith(expect.any(String), resume);
  const link = document.querySelector("a")!;
  expect(link.href).toContain("job=one");
  expect(link.target).toBe("_blank");
  expect(link.rel).toBe("noopener noreferrer");
  expect(document.querySelector("[data-testid=html-export]")).not.toBeNull();
  expect(document.querySelector("[data-testid=typst-export]")).toBeNull();
  expect(downloaded).not.toHaveBeenCalled();
});
it("preserves the Typst exporter when selected", async () => {
  await render("typst");
  expect(document.querySelector("[data-testid=typst-export]")).not.toBeNull();
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
