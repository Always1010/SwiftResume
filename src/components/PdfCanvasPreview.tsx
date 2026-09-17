import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getDocument, PDFWorker, type PDFDocumentLoadingTask, type PDFDocumentProxy, type PDFPageProxy, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { checkPdfPage } from "../model/resumeChecks";

function PdfPage({ page, width, zoom, thumbnail, viewport, onThumbnailReady }: {
  page: PDFPageProxy; width: number; zoom: number | "fit"; thumbnail: boolean;
  viewport: HTMLDivElement | null; onThumbnailReady?: (source: string) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onThumbnailReady);
  const [nearViewport, setNearViewport] = useState(thumbnail);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState("");
  const base = page.getViewport({ scale: 1 });
  const scale = zoom === "fit" ? Math.min(1.5, width / base.width) : zoom / 100 * 96 / 72;
  const pageViewport = page.getViewport({ scale });

  useEffect(() => { callbackRef.current = onThumbnailReady; }, [onThumbnailReady]);
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || thumbnail) return;
    if (typeof IntersectionObserver === "undefined") { setNearViewport(true); return; }
    // Keep all page geometry in the document; allocate canvases only around the scroll position.
    const observer = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), {
      root: viewport, rootMargin: "800px 0px", threshold: 0,
    });
    observer.observe(holder);
    return () => observer.disconnect();
  }, [thumbnail, viewport]);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || !nearViewport) return;
    let active = true;
    let task: RenderTask | undefined;
    // Each render owns its canvas, so a cancelled task can never paint into a newer render.
    const canvas = document.createElement("canvas");
    const renderViewport = page.getViewport({ scale });
    const pixelRatio = thumbnail ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(renderViewport.width * pixelRatio);
    canvas.height = Math.ceil(renderViewport.height * pixelRatio);
    canvas.style.width = `${renderViewport.width}px`;
    canvas.style.height = `${renderViewport.height}px`;
    canvas.dataset.rendered = "false";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `PDF 第 ${page.pageNumber} 页`);
    holder.append(canvas);
    setRendering(true);
    setError("");
    void (async () => {
      task = page.render({ canvas, viewport: renderViewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      await task.promise;
      if (!active) return;
      canvas.dataset.rendered = "true";
      setRendering(false);
      if (thumbnail) callbackRef.current?.(canvas.toDataURL("image/png"));
    })().catch((reason: unknown) => {
      if (active) { setRendering(false); setError(reason instanceof Error ? reason.message : "无法显示 PDF 页面"); }
    });
    return () => {
      active = false;
      task?.cancel();
      canvas.remove();
      // Release the bitmap after PDF.js has finished handling cancellation.
      void (task?.promise ?? Promise.resolve()).catch(() => undefined).then(() => { canvas.width = 0; canvas.height = 0; });
    };
  }, [page, nearViewport, scale, thumbnail]);

  return <div ref={holderRef} className="pdf-page-sheet" data-page-number={page.pageNumber}
    style={{ width: pageViewport.width, height: pageViewport.height }} aria-busy={nearViewport && rendering && !error}>
    {error && <div className="pdf-reader-error" role="alert">第 {page.pageNumber} 页暂时无法显示。可以下载 PDF 后打开。<details><summary>查看原因</summary>{error}</details></div>}
  </div>;
}

export default function PdfCanvasPreview({ blob, zoom: externalZoom, onPageCountChange, thumbnail = false, onThumbnailReady }: { blob: Blob; zoom?: number | "fit"; onPageCountChange?: (count: number) => void; thumbnail?: boolean; onThumbnailReady?: (source: string) => void }) {
  const [loaded, setLoaded] = useState<{ blob: Blob; pdf: PDFDocumentProxy; pages: PDFPageProxy[] } | null>(null);
  const pdf = loaded?.blob === blob ? loaded.pdf : null;
  const pages = pdf ? loaded!.pages : [];
  const [localZoom, setZoom] = useState<number | "fit">("fit");
  const zoom = externalZoom ?? localZoom;
  const [width, setWidth] = useState(600);
  const [error, setError] = useState("");
  const [pageWarnings, setPageWarnings] = useState<{ page: number; message: string }[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef(0);

  useEffect(() => {
    let active = true;
    let loading: PDFDocumentLoadingTask | undefined;
    let nativeWorker: Worker | undefined;
    let worker: PDFWorker | undefined;
    setLoaded(null);
    setError("");
    setPageWarnings([]);
    setDismissed(false);
    void blob.arrayBuffer().then(async (data) => {
      if (!active) return;
      // Explicit local worker ports respect the extension's local-script CSP.
      nativeWorker = new Worker(workerUrl, { type: "module" });
      // @ts-expect-error PDF.js 6.3 accepts Worker ports, but its generated declaration infers only null.
      worker = new PDFWorker({ port: nativeWorker });
      loading = getDocument({ data: new Uint8Array(data), worker, useSystemFonts: false, useWasm: false });
      const document = await loading.promise;
      if (!active) return;
      const documentPages = await Promise.all(Array.from({ length: thumbnail ? 1 : document.numPages }, (_, index) => document.getPage(index + 1)));
      if (!active) return;
      setLoaded({ blob, pdf: document, pages: documentPages });
      if (thumbnail) return;
      const warnings: { page: number; message: string }[] = [];
      for (const page of documentPages) {
        if (!active) return;
        // Pagination hints are optional; text extraction must not hide a valid PDF.
        const text = await page.getTextContent().catch(() => null);
        if (!text) continue;
        const items = text.items.filter((item) => "str" in item);
        const height = page.getViewport({ scale: 1 }).height;
        const used = items.length ? (height - Math.min(...items.map((item) => item.transform[5]))) / height : 0;
        const message = checkPdfPage(items.reduce((n, item) => n + item.str.trim().length, 0), used, page.pageNumber === document.numPages, document.numPages);
        if (message) warnings.push({ page: page.pageNumber, message });
      }
      if (active) setPageWarnings(warnings);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "无法显示 PDF");
    });
    return () => {
      active = false;
      void (async () => {
        await loading?.destroy().catch(() => undefined);
        worker?.destroy();
        nativeWorker?.terminate();
      })();
    };
  }, [blob, thumbnail]);

  useEffect(() => { if (pdf) onPageCountChange?.(pdf.numPages); }, [pdf, onPageCountChange]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setWidth(Math.max(160, viewport.clientWidth - (thumbnail ? 8 : 36)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [thumbnail]);

  useLayoutEffect(() => {
    if (pdf && viewportRef.current) viewportRef.current.scrollTop = scrollPosition.current;
  }, [pdf]);

  const showWarnings = pdf && !dismissed && pageWarnings.length > 0;
  return <section className="pdf-reader" aria-label="最终 PDF 预览">
    {!thumbnail && (externalZoom === undefined || showWarnings) && <div className="pdf-reader-toolbar" role="group" aria-label="PDF 预览工具">
      {externalZoom === undefined && <><span aria-live="polite">{pdf ? `共 ${pdf.numPages} 页` : "正在读取 PDF…"}</span>
        <select aria-label="PDF 缩放" value={zoom} onChange={(event) => setZoom(event.target.value === "fit" ? "fit" : Number(event.target.value))}>
          <option value="fit">适应宽度</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option>
        </select></>}
      {showWarnings && <details className="pdf-page-checks"><summary>分页检查：{pageWarnings.length} 条提示</summary>{pageWarnings.map((warning) => <p key={warning.page}><button type="button" onClick={() => viewportRef.current?.querySelector(`[data-page-number="${warning.page}"]`)?.scrollIntoView({ block: "start" })}>第 {warning.page} 页</button> {warning.message}</p>)}<button type="button" onClick={() => setDismissed(true)}>本次忽略分页提示</button></details>}
    </div>}
    <div ref={viewportRef} className="pdf-page-viewport" aria-busy={!pdf && !error} onScroll={(event) => { if (pdf) scrollPosition.current = event.currentTarget.scrollTop; }}>
      {error && <div className="pdf-reader-error" role="alert">PDF 已生成，暂时无法显示预览。可以下载后打开。<details><summary>查看原因</summary>{error}</details></div>}
      {pages.map((page) => <PdfPage key={page.pageNumber} page={page} width={width} zoom={zoom} thumbnail={thumbnail} viewport={viewportRef.current} onThumbnailReady={onThumbnailReady} />)}
    </div>
  </section>;
}
