import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getDensityLayout, type ResumeDocument } from "../model/resume";
import { loadResumeById } from "../storage/resumeStorage";
import { usePreviewSubscriber } from "../sync/previewSync";
import { paginateHtml } from "../export/htmlPagination";
import { ResumeProfileView, ResumeSectionView } from "./ResumePreview";
import "../htmlPrint.css";

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

export function HtmlPrintPreview({ resumeId }: { resumeId: string }) {
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const received = useRef(false);
  const accept = useCallback((next: ResumeDocument) => {
    received.current = true;
    setResume(next);
    setError("");
    setPageCount(0);
  }, []);
  usePreviewSubscriber(resumeId, accept);
  useEffect(() => {
    let active = true;
    if (!resumeId) { setError("请从编辑页面打开 HTML 打印预览。"); return; }
    void loadResumeById(resumeId).then((next) => {
      if (!active || received.current) return;
      if (next) accept(next);
      else setError("找不到这份简历，请返回编辑页面重新打开。");
    }).catch(() => { if (active && !received.current) setError("读取简历失败，请重新打开预览。"); });
    return () => { active = false; };
  }, [accept, resumeId]);
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
      <div><strong>HTML 打印预览 · 试用</strong><span>{resume?.title} {pageCount > 0 && `· 共 ${pageCount} 页`}</span></div>
      <label>缩放 <select aria-label="HTML 预览缩放" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>{[70, 85, 100, 115].map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
      <button className="primary-button" disabled={!pageCount || !!error} onClick={() => window.print()}>打印 / 另存为 PDF</button>
      <button className="secondary-button" onClick={() => window.close()}>关闭</button>
    </header>
    <p className="html-print-help">使用编辑区经典版式，固定 A4 宽度。在打印窗口选择“另存为 PDF”，纸张 A4、缩放 100%、边距无，关闭页眉和页脚，开启背景图形。当前试用入口不使用模板中心样式。</p>
    {error ? <p className="html-print-status" role="alert">{error}</p> : !pageCount && <p className="html-print-status" role="status">正在加载字体并分页…</p>}
    <div className="html-print-stage" style={{ zoom: zoom / 100 }}>
      {resume && <HtmlResumePages resume={resume} onReady={(count, message) => { setPageCount(count); setError(message); }} />}
    </div>
  </main>;
}
