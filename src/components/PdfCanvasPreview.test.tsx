// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import PdfCanvasPreview from "./PdfCanvasPreview";

const mocks = vi.hoisted(() => ({ load: vi.fn(), destroy: vi.fn(), releaseWorker: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  getDocument: mocks.load,
  PDFWorker: class { constructor(public options: unknown) {} destroy = mocks.releaseWorker; },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("local PDF worker lifecycle", () => {
  it("passes a local module worker to the parser and releases both on close", async () => {
    const terminate = vi.fn();
    const workers: { url: string; options: WorkerOptions }[] = [];
    vi.stubGlobal("Worker", class { constructor(url: string, options: WorkerOptions) { workers.push({ url, options }); } terminate = terminate; });
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    mocks.destroy.mockResolvedValue(undefined);
    mocks.load.mockReturnValue({ promise: new Promise(() => undefined), destroy: mocks.destroy });
    const blob = { arrayBuffer: () => Promise.resolve(new Uint8Array([37, 80, 68, 70]).buffer) } as Blob;
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<PdfCanvasPreview blob={blob} />));
    expect(workers).toHaveLength(1);
    expect(workers[0].url).not.toMatch(/^blob:|^https?:/);
    expect(workers[0].options.type).toBe("module");
    expect(mocks.load).toHaveBeenCalledWith(expect.objectContaining({ worker: expect.anything(), useWasm: false, data: new Uint8Array([37, 80, 68, 70]) }));
    await act(async () => root!.unmount());
    root = undefined;
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(mocks.releaseWorker).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledOnce();
  });
});
