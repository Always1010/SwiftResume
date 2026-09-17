import { useEffect, useRef, useState } from "react";
import { getDocument, PDFWorker, type PDFDocumentLoadingTask, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { checkPdfPage } from "../model/resumeChecks";

export default function PdfCanvasPreview({ blob, zoom: externalZoom, onPageCountChange, thumbnail = false, onThumbnailReady }: { blob: Blob; zoom?: number | "fit"; onPageCountChange?: (count: number) => void; thumbnail?: boolean; onThumbnailReady?: (source: string) => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [localZoom, setZoom] = useState("fit");
  const zoom = externalZoom ?? localZoom;
  const [width, setWidth] = useState(600);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [pageText, setPageText] = useState("");
  const [pageWarnings, setPageWarnings] = useState<{ page: number; message: string }[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    let loading: PDFDocumentLoadingTask | undefined;
    let nativeWorker: Worker | undefined;
    let worker: PDFWorker | undefined;
    setPdf(null);
    setError("");
    setPageWarnings([]);
    setDismissed(false);
    void blob.arrayBuffer().then(async (data) => {
      if (!active) return;
      // An explicit local worker avoids PDF.js creating a blob script for
      // extension origins, whose CSP intentionally only permits local scripts.
      nativeWorker = new Worker(workerUrl, { type: "module" });
      // @ts-expect-error PDF.js 6.3 accepts Worker ports, but its generated declaration infers only null.
      worker = new PDFWorker({ port: nativeWorker });
      loading = getDocument({ data: new Uint8Array(data), worker, useSystemFonts: false, useWasm: false });
      const document = await loading.promise;
      if (active) { setPdf(document); setPageNumber((current) => Math.min(current, document.numPages)); }
      if (thumbnail) return;
      const warnings: { page: number; message: string }[] = [];
      for (let i = 1; active && i <= document.numPages; i++) {
        const page = await document.getPage(i);
        const text = await page.getTextContent();
        const items = text.items.filter((item) => "str" in item);
        const height = page.getViewport({ scale: 1 }).height;
        const used = items.length ? (height - Math.min(...items.map((item) => item.transform[5]))) / height : 0;
        const message = checkPdfPage(items.reduce((n, item) => n + item.str.trim().length, 0), used, i === document.numPages, document.numPages);
        if (message) warnings.push({ page: i, message });
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
    const update = () => setWidth(Math.max(160, viewport.clientWidth - 36));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;
    let active = true;
    let task: RenderTask | undefined;
    setRendering(true);
    setPageText("");
    setError("");
    void pdf.getPage(pageNumber).then(async (page) => {
      if (!active) return;
      const base = page.getViewport({ scale: 1 });
      const scale = zoom === "fit" ? Math.min(1.5, width / base.width) : Number(zoom) / 100 * 96 / 72;
      const viewport = page.getViewport({ scale });
      const pixelRatio = thumbnail ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(viewport.width * pixelRatio);
      canvas.height = Math.ceil(viewport.height * pixelRatio);
      canvas.dataset.rendered = "false";
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      task = page.render({ canvas, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      await task.promise;
      if (!active) return;
      setRendering(false);
      canvas.dataset.rendered = "true";
      if (thumbnail) { onThumbnailReady?.(canvas.toDataURL("image/png")); return; }
      const text = await page.getTextContent();
      if (active) setPageText(text.items.map((item) => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join(""));
    }).catch((reason: unknown) => {
      if (active) { setRendering(false); setError(reason instanceof Error ? reason.message : "无法显示 PDF 页面"); }
    });
    return () => { active = false; task?.cancel(); };
  }, [pdf, pageNumber, width, zoom, thumbnail, onThumbnailReady]);

  return <section className="pdf-reader" aria-label="最终 PDF 预览">
    {!thumbnail && <div className="pdf-reader-toolbar" role="group" aria-label="PDF 翻页与缩放">
      <button type="button" className="secondary-button" disabled={!pdf || pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)}>上一页</button>
      <span aria-live="polite">{pdf ? `第 ${pageNumber} 页 / 共 ${pdf.numPages} 页` : "正在读取 PDF…"}</span>
      <button type="button" className="secondary-button" disabled={!pdf || pageNumber >= pdf.numPages} onClick={() => setPageNumber((value) => value + 1)}>下一页</button>
      {externalZoom === undefined && <select aria-label="PDF 缩放" value={zoom} onChange={(event) => setZoom(event.target.value)}>
        <option value="fit">适应宽度</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option>
      </select>}
      {!dismissed && pageWarnings.length > 0 && <details className="pdf-page-checks"><summary>分页检查：{pageWarnings.length} 条提示</summary>{pageWarnings.map((warning) => <p key={warning.page}><button onClick={() => setPageNumber(warning.page)}>第 {warning.page} 页</button> {warning.message}</p>)}<button onClick={() => setDismissed(true)}>本次忽略分页提示</button></details>}
    </div>}
    <div ref={viewportRef} className="pdf-page-viewport" aria-busy={rendering && !error}>
      {error && <div className="pdf-reader-error" role="alert">PDF 已生成，暂时无法显示预览。可以下载后打开。<details><summary>查看原因</summary>{error}</details></div>}
      <canvas ref={canvasRef} role="img" aria-label={`PDF 第 ${pageNumber} 页，文字内容可在下方查看`} hidden={Boolean(error) || !pdf} />
    </div>
    {!thumbnail && <details className="pdf-text-check" key={pageNumber}><summary>查看本页文字</summary><p>{pageText || "正在读取本页文字…"}</p></details>}
  </section>;
}
