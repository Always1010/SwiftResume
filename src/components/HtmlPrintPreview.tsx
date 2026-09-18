import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { getDensityLayout, type ResumeDocument } from "../model/resume";
import { loadResumeById } from "../storage/resumeStorage";
import { usePreviewSubscriber } from "../sync/previewSync";
import { paginateHtml } from "../export/htmlPagination";
import { ResumeProfileView, ResumeSectionView } from "./ResumePreview";
import "../htmlPrint.css";
import { loadPrintJob } from "../export/htmlPrintJobs";
import { commitHtmlPages, prepareHtmlFonts } from "../export/htmlPreviewUpdates";

const HtmlResumeContent = memo(function HtmlResumeContent({ resume }: { resume: ResumeDocument }) {
  return <div className="html-resume-content">
    <section className="resume-editable-block profile-block"><ResumeProfileView resume={resume} /></section>
    {resume.sections.filter((section) => section.enabled).map((section) => <section key={section.id} className="resume-editable-block section-block"><ResumeSectionView section={section} /></section>)}
  </div>;
}, (previous, next) => previous.resume.profile === next.resume.profile && previous.resume.sections === next.resume.sections);

export function HtmlResumePages({ resume, onReady, onUpdating }: { resume: ResumeDocument; onReady?: (pages: number, error: string) => void; onUpdating?: (updating: boolean) => void }) {
  const source = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const photo = useRef<{ url: string; request: Promise<void> } | null>(null);
  const callback = useRef(onReady);
  const updatingCallback = useRef(onUpdating);
  callback.current = onReady;
  updatingCallback.current = onUpdating;
  const density = getDensityLayout(resume.theme.density);
  const style = {
    "--resume-accent": resume.theme.accent,
    "--section-space": `${density.sectionSpacePx}px`,
    "--entry-space": `${density.entrySpacePx}px`,
    "--body-line": density.bodyLine,
    "--resume-font-size": `${density.fontSizePx}px`,
    fontSize: `${density.fontSizePx}px`,
  } as CSSProperties;
  useLayoutEffect(() => {
    let cancelled = false;
    let frame = 0;
    updatingCallback.current?.(true);
    // Apply density immediately to existing text. Reflow comes from CSS, without
    // recreating the rich text or putting the preview back into its initial state.
    for (const page of Array.from(pages.current?.children ?? [])) {
      (page as HTMLElement).style.cssText = source.current!.style.cssText;
    }
    const schedule = () => {
      if (cancelled) return;
      frame = window.requestAnimationFrame(() => {
        if (cancelled || !source.current || !measure.current || !pages.current) return;
        try {
          const count = paginateHtml(source.current, measure.current);
          commitHtmlPages(measure.current, pages.current);
          callback.current?.(count, "");
        } catch (error) {
          callback.current?.(0, error instanceof Error ? error.message : "排版失败，请重新打开预览。");
        } finally {
          measure.current.replaceChildren();
          updatingCallback.current?.(false);
        }
      });
    };
    const pending: Promise<void>[] = [];
    const fonts = prepareHtmlFonts();
    if (fonts) pending.push(fonts);
    const img = source.current?.querySelector("img");
    if (img && !(img.complete && img.naturalWidth > 0)) {
      if (photo.current?.url !== img.src) photo.current = { url: img.src, request: img.decode() };
      pending.push(photo.current.request);
    } else if (!img) photo.current = null;
    if (pending.length) {
      void Promise.all(pending).then(schedule).catch((error: unknown) => {
        if (cancelled) return;
        photo.current = null;
        callback.current?.(0, error instanceof Error ? error.message : "字体或照片加载失败，请重试。");
        updatingCallback.current?.(false);
      });
    } else schedule();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [resume]);
  return <>
    <div ref={source} className="resume-page resume-editor-canvas resume-template-classic html-resume html-resume-source" style={style} aria-hidden="true">
      <HtmlResumeContent resume={resume} />
    </div>
    <div ref={measure} className="html-resume-measure" aria-hidden="true" />
    <div ref={pages} className="html-resume-pages" aria-label="HTML 简历分页预览" />
  </>;
}

export function HtmlCanvasPreview({ resume, zoom = "fit", onPageCountChange, onReadyChange }: { resume: ResumeDocument; zoom?: number | "fit"; onPageCountChange?: (count: number) => void; onReadyChange?: (ready: boolean) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [updating, setUpdating] = useState(true);
  const [state, setState] = useState<{ count: number; error: string; resume: ResumeDocument | null }>({ count: 0, error: "", resume: null });
  const ready = !updating && !state.error && state.count > 0 && state.resume === resume;
  useLayoutEffect(() => { onReadyChange?.(ready); }, [ready, onReadyChange]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => setFit(Math.max(0.1, Math.min(1, (element.clientWidth - 40) / (210 * 96 / 25.4))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={viewport} className="preview-scroller html-canvas-preview" aria-label="HTML 简历预览" aria-busy={!ready}>
    {state.error ? <p role="alert">{state.error}{state.count > 0 && "，下方保留上次预览。"}</p> : !state.count && <p role="status">正在加载字体并分页…</p>}
    <div className="html-canvas-stage" style={{ zoom: zoom === "fit" ? fit : zoom / 100 }}>
      <HtmlResumePages resume={resume} onUpdating={setUpdating} onReady={(count, error) => {
        setState((current) => ({ count: count || current.count, error, resume: error ? null : resume }));
        if (count > 0) onPageCountChange?.(count);
      }} />
    </div>
  </div>;
}

export function HtmlPrintPreview({ resumeId, jobId = "" }: { resumeId: string; jobId?: string }) {
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const received = useRef(false);
  const printRequested = useRef(false);
  const accept = useCallback((next: ResumeDocument) => {
    received.current = true;
    setResume(next);
    setError("");
    setPageCount(0);
  }, []);
  usePreviewSubscriber(jobId ? "" : resumeId, accept);
  useEffect(() => {
    let active = true;
    if (!resumeId && !jobId) { setError("请从编辑页面重新导出 PDF。"); return; }
    void (jobId ? loadPrintJob(jobId) : loadResumeById(resumeId)).then((next) => {
      if (!active || received.current) return;
      if (next) accept(next);
      else setError("打印快照已过期或简历不存在，请返回编辑页面重新导出。");
    }).catch(() => { if (active && !received.current) setError("读取简历失败，请重新打开预览。"); });
    return () => { active = false; };
  }, [accept, resumeId, jobId]);
  useEffect(() => {
    if (!jobId || !pageCount || error || printRequested.current) return;
    const timer = window.setTimeout(() => { printRequested.current = true; window.print(); }, 0);
    return () => window.clearTimeout(timer);
  }, [jobId, pageCount, error]);
  useEffect(() => { document.title = `${resume?.title || "简历"} · HTML 打印`; }, [resume?.title]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p" && !pageCount) event.preventDefault();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [pageCount]);
  return <main className="html-print-app">
    <header className="html-print-toolbar">
      <div><strong>HTML/CSS 打印快照</strong><span>{resume?.title} {pageCount > 0 && `· 共 ${pageCount} 页`}</span></div>
      <label>缩放 <select aria-label="HTML 预览缩放" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>{[70, 85, 100, 115].map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
      <button className="primary-button" disabled={!pageCount || !!error} onClick={() => window.print()}>打印 / 另存为 PDF</button>
      <button className="secondary-button" onClick={() => window.close()}>关闭</button>
    </header>
    <p className="html-print-help">在打印窗口选择“另存为 PDF”，纸张 A4、缩放 100%、边距无，关闭页眉和页脚，开启背景图形。此页保存导出时的排版；继续编辑后，需要重新导出才能更新快照。</p>
    {error ? <p className="html-print-status" role="alert">{error}</p> : !pageCount && <p className="html-print-status" role="status">正在加载字体并分页…</p>}
    <div className="html-print-stage" style={{ zoom: zoom / 100 }}>
      {resume && <HtmlResumePages resume={resume} onReady={(count, message) => { setPageCount(count); setError(message); }} />}
    </div>
  </main>;
}
