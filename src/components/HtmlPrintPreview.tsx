import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getDensityLayout, type ResumeDocument } from "../model/resume";
import { loadResumeById } from "../storage/resumeStorage";
import { usePreviewSubscriber } from "../sync/previewSync";
import { paginateHtml } from "../export/htmlPagination";
import { ResumeProfileView, ResumeSectionView } from "./ResumePreview";
import "../htmlPrint.css";
import { loadPrintJob } from "../export/htmlPrintJobs";

export function HtmlResumePages({ resume, onReady }: { resume: ResumeDocument; onReady?: (pages: number, error: string) => void }) {
  const source = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const callback = useRef(onReady);
  callback.current = onReady;
  const density = getDensityLayout(resume.theme.density);
  const style = {
    "--resume-accent": resume.theme.accent,
    "--section-space": `${density.sectionSpacePx}px`,
    "--entry-space": `${density.entrySpacePx}px`,
    "--body-line": density.bodyLine,
    "--resume-font-size": `${density.fontSizePx}px`,
    fontSize: `${density.fontSizePx}px`,
  } as CSSProperties;
  useEffect(() => {
    let cancelled = false;
    callback.current?.(0, "");
    pages.current?.replaceChildren();
    async function prepare() {
      try {
        await Promise.all([document.fonts.load('400 12px "SwiftResume Browser Sans"'), document.fonts.load('700 12px "SwiftResume Browser Sans"')]);
        await document.fonts.ready;
        await Promise.all(Array.from(source.current?.querySelectorAll("img") ?? []).map((img) => img.decode()));
        if (cancelled || !source.current || !pages.current) return;
        const count = paginateHtml(source.current, pages.current);
        callback.current?.(count, "");
      } catch (error) {
        if (!cancelled) callback.current?.(0, error instanceof Error ? error.message : "排版失败，请重新打开预览。");
      }
    }
    void prepare();
    return () => { cancelled = true; };
  }, [resume]);
  return <>
    <div ref={source} className="resume-page resume-editor-canvas resume-template-classic html-resume html-resume-source" style={style} aria-hidden="true">
      <div className="html-resume-content">
        <section className="resume-editable-block profile-block"><ResumeProfileView resume={resume} /></section>
        {resume.sections.filter((section) => section.enabled).map((section) => <section key={section.id} className="resume-editable-block section-block"><ResumeSectionView section={section} /></section>)}
      </div>
    </div>
    <div ref={pages} className="html-resume-pages" aria-label="HTML 简历分页预览" />
  </>;
}

export function HtmlCanvasPreview({ resume, zoom = "fit", onPageCountChange }: { resume: ResumeDocument; zoom?: number | "fit"; onPageCountChange?: (count: number) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [state, setState] = useState({ count: 0, error: "" });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => setFit(Math.max(0.1, Math.min(1, (element.clientWidth - 40) / (210 * 96 / 25.4))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={viewport} className="preview-scroller html-canvas-preview" aria-label="HTML 简历预览" aria-busy={!state.count && !state.error}>
    {state.error ? <p role="alert">{state.error}</p> : !state.count && <p role="status">正在加载字体并分页…</p>}
    <div className="html-canvas-stage" style={{ zoom: zoom === "fit" ? fit : zoom / 100 }}>
      <HtmlResumePages resume={resume} onReady={(count, error) => { setState({ count, error }); onPageCountChange?.(count); }} />
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
