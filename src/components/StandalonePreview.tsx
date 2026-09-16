import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportTypstPdf } from "../export/typstPdf";
import type { ResumeDocument } from "../model/resume";
import { loadResumeById, saveResumeById } from "../storage/resumeStorage";
import { usePreviewSubscriber } from "../sync/previewSync";
import { getResumeTemplate } from "../templates/registry";
import { ResumePreview } from "./ResumePreview";
import { TemplateGallery } from "./TemplateGallery";

const PAPER_WIDTH_PX = 794;
const MIN_ZOOM = 50;
const MAX_ZOOM = 140;

export function StandalonePreview({ resumeId }: { resumeId: string }) {
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [manualZoom, setManualZoom] = useState(100);
  const [fitZoom, setFitZoom] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [styleDirty, setStyleDirty] = useState(false);
  const [styleError, setStyleError] = useState("");
  const [draftTheme, setDraftTheme] = useState<ResumeDocument["theme"] | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const styleDirtyRef = useRef(false);

  const acceptResume = useCallback((document: ResumeDocument) => {
    setResume(document);
    if (!styleDirtyRef.current) setDraftTheme(document.theme);
  }, []);
  const publishCommittedResume = usePreviewSubscriber(resumeId, acceptResume);

  useEffect(() => {
    if (!resumeId) {
      setError("预览链接缺少简历标识，请从编辑页面重新打开。");
      return;
    }
    let active = true;
    loadResumeById(resumeId).then((document) => {
      if (!active) return;
      if (document) {
        setResume(document);
        if (!styleDirtyRef.current) setDraftTheme(document.theme);
      }
      else setError("找不到这份简历，它可能已经被删除。");
    }).catch(() => active && setError("读取简历失败，请返回编辑页面后重试。"));
    return () => { active = false; };
  }, [resumeId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const availableWidth = Math.max(360, viewport.clientWidth - 72);
      setFitZoom(Math.max(MIN_ZOOM, Math.min(100, Math.floor(availableWidth / PAPER_WIDTH_PX * 100))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const zoom = fitWidth ? fitZoom : manualZoom;
  const title = useMemo(() => resume?.title || "独立预览", [resume?.title]);
  const previewResume = useMemo(() => resume && draftTheme ? { ...resume, theme: draftTheme } : resume, [draftTheme, resume]);
  const selectedTemplate = draftTheme ? getResumeTemplate(draftTheme.templateId) : null;
  useEffect(() => { document.title = `${title} · SwiftResume 预览`; }, [title]);

  const adjustZoom = (delta: number) => {
    setFitWidth(false);
    setManualZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta)));
  };
  const updatePageCount = useCallback((value: number) => setPageCount(value), []);
  const updateDraftTheme = (change: Partial<ResumeDocument["theme"]>) => {
    if (!resume || !draftTheme) return;
    const next = { ...draftTheme, ...change };
    const dirty = next.templateId !== resume.theme.templateId
      || next.density !== resume.theme.density
      || next.accent !== resume.theme.accent;
    styleDirtyRef.current = dirty;
    setStyleDirty(dirty);
    setStyleError("");
    setDraftTheme(next);
  };
  const saveCurrentStyle = async () => {
    if (!resume || !draftTheme || !styleDirty) return;
    setSavingStyle(true);
    setStyleError("");
    const nextResume: ResumeDocument = { ...resume, theme: draftTheme, updatedAt: new Date().toISOString() };
    try {
      await saveResumeById(resumeId, nextResume);
      styleDirtyRef.current = false;
      setStyleDirty(false);
      setResume(nextResume);
      publishCommittedResume(nextResume);
    } catch (saveError) {
      setStyleError(saveError instanceof Error ? saveError.message : "保存当前样式失败");
    } finally {
      setSavingStyle(false);
    }
  };
  const exportPdf = async () => {
    if (!previewResume) return;
    setExporting(true);
    try {
      await exportTypstPdf(previewResume);
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : "未知错误";
      window.alert(`Typst PDF 导出失败，将打开浏览器打印作为备用方案。\n\n${message}`);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="standalone-preview">
      <header className="standalone-preview-toolbar">
        <div className="standalone-preview-brand">
          <img src="./icons/icon32.png" alt="" />
          <div><strong>SwiftResume</strong><span>{title}</span></div>
          {previewResume && <span className="page-count-badge">共 {pageCount} 页</span>}
        </div>
        <div className="standalone-preview-actions">
          <button type="button" className={`secondary-button ${fitWidth ? "active" : ""}`} onClick={() => setFitWidth(true)}>适应宽度</button>
          <div className="standalone-zoom-control" aria-label="预览缩放">
            <button type="button" aria-label="缩小预览" onClick={() => adjustZoom(-10)}>−</button>
            <output>{zoom}%</output>
            <button type="button" aria-label="放大预览" onClick={() => adjustZoom(10)}>＋</button>
          </div>
          <button type="button" className="secondary-button save-style-button" disabled={!styleDirty || savingStyle} onClick={() => void saveCurrentStyle()}>{savingStyle ? "正在保存…" : styleDirty ? "保存当前样式" : "样式已保存"}</button>
          <button type="button" className="primary-button" disabled={!previewResume || exporting} onClick={() => void exportPdf()}>{exporting ? "正在生成…" : "导出 PDF"}</button>
          <button type="button" className="secondary-button" onClick={() => window.close()}>关闭页面</button>
        </div>
      </header>
      <div className="standalone-preview-workspace">
        {draftTheme && previewResume && <TemplateGallery selectedId={draftTheme.templateId} resume={previewResume} onSelect={(templateId) => updateDraftTheme({ templateId })} />}
        <section className="standalone-preview-main">
          {draftTheme && (
            <div className="standalone-appearance-bar">
              <div className="standalone-template-summary"><strong>{selectedTemplate?.name}</strong><span>{selectedTemplate?.description}</span></div>
              <label className="density-control">
                <span>紧凑</span>
                <input aria-label="独立预览排版密度" type="range" min="0" max="100" step="1" value={draftTheme.density} onChange={(event) => updateDraftTheme({ density: Number(event.target.value) })} />
                <span>宽松</span>
                <output>{draftTheme.density}</output>
              </label>
              <label className="accent-picker" title="强调色"><span>配色</span><input aria-label="独立预览配色" type="color" value={draftTheme.accent} onChange={(event) => updateDraftTheme({ accent: event.target.value })} /></label>
              {styleError && <span className="standalone-style-error">{styleError}</span>}
            </div>
          )}
          <div ref={viewportRef} className="standalone-preview-viewport">
            {previewResume ? <ResumePreview resume={previewResume} zoom={zoom} templateId={previewResume.theme.templateId} onPageCountChange={updatePageCount} /> : (
              <div className="standalone-preview-empty"><strong>{error || "正在读取简历…"}</strong>{error && <span>你可以关闭此页面并重新打开独立预览。</span>}</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
