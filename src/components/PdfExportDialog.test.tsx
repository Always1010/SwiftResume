// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBlankResume } from "../model/resume";
import type { GeneratedPdf } from "../export/typstPdf";
import { getPdfArtifact } from "../export/pdfArtifact";
import { PdfExportDialog } from "./PdfExportDialog";

vi.mock("./Modal", () => ({ Modal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("./PdfCanvasPreview", () => ({ default: ({ blob }: { blob: Blob }) => <div aria-label="最终 PDF 预览" data-size={blob.size} /> }));
vi.mock("../export/pdfArtifact", () => ({ getPdfArtifact: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
const artifact: GeneratedPdf = { blob: new Blob(["%PDF-1.7"], { type: "application/pdf" }), filename: "投递版.pdf" };
const createUrl = vi.fn();
const revokeUrl = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  createUrl.mockReturnValue("blob:verified-pdf");
  vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
  vi.mocked(getPdfArtifact).mockResolvedValue(artifact);
});
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function render() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<StrictMode><PdfExportDialog resume={createBlankResume()} onClose={() => undefined} /></StrictMode>));
  return { container };
}

describe("final PDF preview", () => {
  it("previews and downloads the same generated file, releasing its URL on close", async () => {
    const { container } = await render();
    expect(getPdfArtifact).toHaveBeenCalledOnce();
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(artifact.blob);
    expect(container.querySelector('[aria-label="最终 PDF 预览"]')?.getAttribute("data-size")).toBe(String(artifact.blob.size));
    const download = container.querySelector<HTMLAnchorElement>("a[download]")!;
    expect(download.href).toBe("blob:verified-pdf");
    expect(download.download).toBe("投递版.pdf");
    const print = [...container.querySelectorAll("a")].find((link) => link.textContent === "打印 PDF ↗")!;
    expect(print.href).toBe(download.href);
    expect(print.target).toBe("_blank");
    expect(container.textContent).not.toContain("浏览器打印");
    act(() => root!.unmount());
    root = undefined;
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith("blob:verified-pdf");
  });
  it("shows a recoverable error and only retries when requested", async () => {
    vi.mocked(getPdfArtifact).mockRejectedValueOnce(new Error("字体加载失败"));
    const { container } = await render();
    expect(container.textContent).toContain("字体加载失败");
    expect(container.querySelector("a[download]")).toBeNull();
    expect(container.textContent).not.toContain("浏览器打印");
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "重新生成")!.click());
    expect(getPdfArtifact).toHaveBeenCalledTimes(2);
    expect(container.querySelector("a[download]")).not.toBeNull();
  });
  it("does not create a URL or reopen the preview after closing a pending export", async () => {
    let resolve!: (value: GeneratedPdf) => void;
    vi.mocked(getPdfArtifact).mockReturnValue(new Promise((done) => { resolve = done; }));
    await render();
    act(() => root!.unmount());
    root = undefined;
    await act(async () => resolve(artifact));
    expect(createUrl).not.toHaveBeenCalled();
  });
});
