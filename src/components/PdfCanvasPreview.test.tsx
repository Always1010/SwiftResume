// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PdfCanvasPreview from "./PdfCanvasPreview";

const mocks = vi.hoisted(() => ({ load: vi.fn(), destroy: vi.fn(), releaseWorker: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  getDocument: mocks.load,
  PDFWorker: class { constructor(public options: unknown) {} destroy = mocks.releaseWorker; },
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/assets/pdf.worker.min.mjs" }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;
let observers: { target?: Element; callback: IntersectionObserverCallback; options: IntersectionObserverInit; disconnect: ReturnType<typeof vi.fn> }[];
const terminate = vi.fn();
const workers: { url: string; options: WorkerOptions }[] = [];
const blob = () => ({ arrayBuffer: () => Promise.resolve(new Uint8Array([37, 80, 68, 70]).buffer) }) as Blob;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
function makeDocument(count = 3, pending = false) {
  const pages = Array.from({ length: count }, (_, i) => ({
    pageNumber: i + 1,
    getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: (600 + i * 20) * scale, height: (840 + i * 10) * scale })),
    getTextContent: vi.fn().mockResolvedValue({ items: [{ str: "完整简历经历内容", transform: [1, 0, 0, 1, 0, 300] }] }),
    render: vi.fn(() => ({ ...(pending ? deferred() : { promise: Promise.resolve(), resolve: () => undefined }), cancel: vi.fn() })),
  }));
  const pdf = { numPages: count, getPage: vi.fn(async (number: number) => pages[number - 1]) };
  mocks.load.mockReturnValue({ promise: Promise.resolve(pdf), destroy: mocks.destroy });
  return { pdf, pages };
}
async function render(props: Parameters<typeof PdfCanvasPreview>[0]) {
  await act(async () => root!.render(<PdfCanvasPreview {...props} />));
}
async function intersect(page: number, visible: boolean) {
  const observer = observers.find((item) => item.target?.getAttribute("data-page-number") === String(page));
  expect(observer).toBeDefined();
  await act(async () => observer!.callback([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver));
}
beforeEach(() => {
  observers = [];
  workers.length = 0;
  vi.stubGlobal("Worker", class { constructor(url: string, options: WorkerOptions) { workers.push({ url, options }); } terminate = terminate; });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class {
    target?: Element;
    disconnect = vi.fn();
    constructor(public callback: IntersectionObserverCallback, public options: IntersectionObserverInit) { observers.push(this); }
    observe(target: Element) { this.target = target; }
  });
  mocks.destroy.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("continuous PDF preview", () => {
  it("passes a local module worker to the parser and releases both on close", async () => {
    mocks.load.mockReturnValue({ promise: new Promise(() => undefined), destroy: mocks.destroy });
    await render({ blob: blob() });
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

  it("lays out every page, renders nearby pages, and frees canvases when scrolled away", async () => {
    const { pages } = makeDocument();
    const onPageCountChange = vi.fn();
    await render({ blob: blob(), zoom: 100, onPageCountChange });
    const sheets = container.querySelectorAll<HTMLElement>(".pdf-page-sheet");
    expect(sheets).toHaveLength(3);
    expect([...sheets].map((sheet) => sheet.dataset.pageNumber)).toEqual(["1", "2", "3"]);
    expect(sheets[0].style.height).toBe("1120px");
    expect(sheets[1].style.width).toBe(`${620 * 96 / 72}px`);
    expect(onPageCountChange).toHaveBeenCalledWith(3);
    expect(container.querySelector(".pdf-reader-toolbar")).toBeNull();
    expect(container.textContent).not.toMatch(/上一页|下一页|本页文字/);
    expect(pages.every((page) => page.render.mock.calls.length === 0)).toBe(true);
    expect(observers[0].options).toEqual({ root: container.querySelector(".pdf-page-viewport"), rootMargin: "800px 0px", threshold: 0 });
    await intersect(1, true);
    await intersect(2, true);
    expect(container.querySelectorAll('canvas[data-rendered="true"]')).toHaveLength(2);
    const firstCanvas = sheets[0].querySelector("canvas")!;
    await intersect(1, false);
    expect(sheets[0].querySelector("canvas")).toBeNull();
    expect(firstCanvas.width).toBe(0);
    expect(sheets[0].style.height).toBe("1120px");
    await intersect(3, true);
    expect(pages[2].render).toHaveBeenCalledOnce();
    expect(container.querySelectorAll("canvas")).toHaveLength(2);
  });

  it("isolates cancelled zoom renders and ignores their late completion", async () => {
    const { pages } = makeDocument(1, true);
    const source = blob();
    await render({ blob: source, zoom: 100 });
    await intersect(1, true);
    const oldCanvas = container.querySelector("canvas")!;
    const oldTask = pages[0].render.mock.results[0].value;
    await render({ blob: source, zoom: 125 });
    expect(oldTask.cancel).toHaveBeenCalledOnce();
    const currentCanvas = container.querySelector("canvas")!;
    expect(currentCanvas).not.toBe(oldCanvas);
    expect(currentCanvas.style.width).toBe("1000px");
    await act(async () => oldTask.resolve());
    expect(currentCanvas.dataset.rendered).toBe("false");
    expect(oldCanvas.isConnected).toBe(false);
    const latestTask = pages[0].render.mock.results[1].value;
    await act(async () => latestTask.resolve());
    expect(currentCanvas.dataset.rendered).toBe("true");
  });

  it("cancels old document renders and releases the document when the blob changes", async () => {
    const old = makeDocument(2, true);
    await render({ blob: blob(), zoom: 100 });
    await intersect(1, true);
    const oldTask = old.pages[0].render.mock.results[0].value;
    const oldCanvas = container.querySelector("canvas")!;
    makeDocument(1);
    await render({ blob: blob(), zoom: 100 });
    expect(oldTask.cancel).toHaveBeenCalledOnce();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledOnce();
    expect(container.querySelectorAll(".pdf-page-sheet")).toHaveLength(1);
    await act(async () => oldTask.resolve());
    expect(oldCanvas.isConnected).toBe(false);
    expect(oldCanvas.width).toBe(0);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("restores the reading position after a replacement PDF has loaded", async () => {
    makeDocument(3);
    await render({ blob: blob(), zoom: 100 });
    const viewport = container.querySelector<HTMLElement>(".pdf-page-viewport")!;
    await act(async () => { viewport.scrollTop = 1300; viewport.dispatchEvent(new Event("scroll", { bubbles: true })); });
    let finish!: (pdf: unknown) => void;
    const next = makeDocument(3);
    mocks.load.mockReturnValue({ promise: new Promise((resolve) => { finish = resolve; }), destroy: mocks.destroy });
    await render({ blob: blob(), zoom: 100 });
    expect(container.querySelectorAll(".pdf-page-sheet")).toHaveLength(0);
    await act(async () => { viewport.scrollTop = 0; viewport.dispatchEvent(new Event("scroll", { bubbles: true })); });
    await act(async () => finish(next.pdf));
    expect(viewport.scrollTop).toBe(1300);
    expect(container.querySelectorAll(".pdf-page-sheet")).toHaveLength(3);
  });

  it("does not report a PDF failure when optional pagination text extraction fails", async () => {
    const { pages } = makeDocument(1);
    pages[0].getTextContent.mockRejectedValue(new Error("unsupported text"));
    await render({ blob: blob(), zoom: 100 });
    await intersect(1, true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('canvas[data-rendered="true"]')).not.toBeNull();
  });

  it("keeps thumbnail capture on the first page without extracting text", async () => {
    const { pdf, pages } = makeDocument(3, true);
    const onThumbnailReady = vi.fn();
    const newCallback = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,preview");
    const source = blob();
    await render({ blob: source, thumbnail: true, onThumbnailReady });
    expect(pdf.getPage).toHaveBeenCalledExactlyOnceWith(1);
    expect(container.querySelectorAll(".pdf-page-sheet")).toHaveLength(1);
    expect(observers).toHaveLength(0);
    await render({ blob: source, thumbnail: true, onThumbnailReady: newCallback });
    expect(pages[0].render).toHaveBeenCalledOnce();
    await act(async () => pages[0].render.mock.results[0].value.resolve());
    expect(onThumbnailReady).not.toHaveBeenCalled();
    expect(newCallback).toHaveBeenCalledWith("data:image/png;base64,preview");
    expect(container.querySelector('canvas[data-rendered="true"]')).not.toBeNull();
    expect(pages.every((page) => page.getTextContent.mock.calls.length === 0)).toBe(true);
  });

  it("scrolls pagination warnings to the matching page and hides dismissed controls", async () => {
    const { pages } = makeDocument(2);
    pages[1].getTextContent.mockResolvedValue({ items: [] });
    await render({ blob: blob(), zoom: "fit" });
    const secondPage = container.querySelector<HTMLElement>('[data-page-number="2"]')!;
    const scrollIntoView = vi.fn();
    secondPage.scrollIntoView = scrollIntoView;
    const button = [...container.querySelectorAll("button")].find((element) => element.textContent === "第 2 页")!;
    await act(async () => button.click());
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    await act(async () => [...container.querySelectorAll("button")].find((element) => element.textContent === "本次忽略分页提示")!.click());
    expect(container.querySelector(".pdf-reader-toolbar")).toBeNull();
    expect(container.querySelectorAll(".pdf-page-sheet")).toHaveLength(2);
  });

  it("provides total pages and zoom when no external toolbar controls the preview", async () => {
    makeDocument(2);
    await render({ blob: blob() });
    expect(container.textContent).toContain("共 2 页");
    const select = container.querySelector("select")!;
    await act(async () => { select.value = "75"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(container.querySelector<HTMLElement>(".pdf-page-sheet")!.style.width).toBe("600px");
  });
});
