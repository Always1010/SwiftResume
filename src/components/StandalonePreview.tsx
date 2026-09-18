import { usePdfPrintShortcut } from "../export/usePdfPrintShortcut";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ResumeExportDialog } from "./ResumeExportDialog";
import { useOutputEngine } from "../settings/useOutputEngine";
import { ResumeCheckDialog } from "./ResumeCheckDialog";
import { exportRecord } from "../model/resumeVersions";
import type { ResumeDocument } from "../model/resume";
import { loadResumeById, saveResumeById } from "../storage/resumeStorage";
import { usePreviewSubscriber } from "../sync/previewSync";
import { getResumeTemplate } from "../templates/registry";
import { PhotoBackgroundPicker } from "./PhotoBackgroundPicker";
import { ResumePreview } from "./ResumePreview";
import { TemplateGallery } from "./TemplateGallery";

const PAPER_WIDTH_PX = 794;
const MIN_ZOOM = 50;
const MAX_ZOOM = 140;
export const MIN_TEMPLATE_GALLERY_WIDTH = 220;
export const DEFAULT_TEMPLATE_GALLERY_WIDTH = 340;
export const MAX_TEMPLATE_GALLERY_WIDTH = 860;
const TEMPLATE_GALLERY_WIDTH_KEY = "swift-resume-template-gallery-width";
const STYLE_SAVE_DELAY_MS = 180;

interface AppearanceChange {
  theme?: Partial<ResumeDocument["theme"]>;
  photoBackground?: string;
}

export const clampTemplateGalleryWidth = (width: number, availableWidth = MAX_TEMPLATE_GALLERY_WIDTH) =>
  Math.min(Math.max(MIN_TEMPLATE_GALLERY_WIDTH, availableWidth), Math.max(MIN_TEMPLATE_GALLERY_WIDTH, Math.min(MAX_TEMPLATE_GALLERY_WIDTH, width)));

export function updateResumeAppearance(resume: ResumeDocument, change: AppearanceChange, updatedAt?: string): ResumeDocument {
  const nextUpdatedAt = updatedAt ?? new Date(Math.max(Date.now(), (Date.parse(resume.updatedAt) || 0) + 1)).toISOString();
  return {
    ...resume,
    theme: { ...resume.theme, ...change.theme },
    profile: {
      ...resume.profile,
      photoBackground: change.photoBackground ?? resume.profile.photoBackground,
    },
    updatedAt: nextUpdatedAt,
  };
}

function readTemplateGalleryWidth() {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE_GALLERY_WIDTH;
  try {
    const stored = Number(window.localStorage.getItem(TEMPLATE_GALLERY_WIDTH_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampTemplateGalleryWidth(stored) : DEFAULT_TEMPLATE_GALLERY_WIDTH;
  } catch {
    return DEFAULT_TEMPLATE_GALLERY_WIDTH;
  }
}

export function StandalonePreview({ resumeId }: { resumeId: string }) {
  const engine = useOutputEngine();
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [manualZoom, setManualZoom] = useState(100);
  const [fitZoom, setFitZoom] = useState(100);
  const [pdfResume, setPdfResume] = useState<ResumeDocument | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [styleSyncState, setStyleSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [styleError, setStyleError] = useState("");
  const [galleryWidth, setGalleryWidth] = useState(readTemplateGalleryWidth);
  const [galleryMaxWidth, setGalleryMaxWidth] = useState(MAX_TEMPLATE_GALLERY_WIDTH);
  const [resizingGallery, setResizingGallery] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<ResumeDocument | null>(null);
  const styleSaveTimerRef = useRef<number | null>(null);

  const acceptResume = useCallback((document: ResumeDocument) => {
    if (styleSaveTimerRef.current !== null) {
      window.clearTimeout(styleSaveTimerRef.current);
      styleSaveTimerRef.current = null;
    }
    resumeRef.current = document;
    setResume(document);
    setStyleSyncState("saved");
    setStyleError("");
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
        resumeRef.current = document;
        setResume(document);
      }
      else setError("找不到这份简历，它可能已经被删除。");
    }).catch(() => active && setError("读取简历失败，请返回编辑页面后重试。"));
    return () => { active = false; };
  }, [resumeId]);

  useEffect(() => () => {
    if (styleSaveTimerRef.current !== null) window.clearTimeout(styleSaveTimerRef.current);
  }, []);

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

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const update = () => {
      const nextMax = Math.min(MAX_TEMPLATE_GALLERY_WIDTH, Math.max(MIN_TEMPLATE_GALLERY_WIDTH, workspace.clientWidth - 8));
      setGalleryMaxWidth(nextMax);
      setGalleryWidth((current) => clampTemplateGalleryWidth(current, nextMax));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TEMPLATE_GALLERY_WIDTH_KEY, String(Math.round(galleryWidth)));
    } catch {
      // The resizer still works when browser storage is unavailable.
    }
  }, [galleryWidth]);

  useEffect(() => {
    if (!resizingGallery) return;
    const updateWidth = (clientX: number) => {
      const left = workspaceRef.current?.getBoundingClientRect().left ?? 0;
      setGalleryWidth(clampTemplateGalleryWidth(clientX - left, galleryMaxWidth));
    };
    const handlePointerMove = (event: PointerEvent) => updateWidth(event.clientX);
    const stopResizing = () => setResizingGallery(false);
    document.body.classList.add("resizing-template-gallery");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
    return () => {
      document.body.classList.remove("resizing-template-gallery");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [galleryMaxWidth, resizingGallery]);

  usePdfPrintShortcut(() => { if (resume) setCheckOpen(true); });
  const zoom = fitWidth ? fitZoom : manualZoom;
  const title = useMemo(() => resume?.title || "独立预览", [resume?.title]);
  const previewResume = resume;
  const selectedTemplate = resume ? getResumeTemplate(resume.theme.templateId) : null;
  useEffect(() => { document.title = `${title} · SwiftResume 预览`; }, [title]);

  const adjustZoom = (delta: number) => {
    setFitWidth(false);
    setManualZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta)));
  };
  const updatePageCount = useCallback((value: number) => setPageCount(value), []);
  const updateAppearance = (change: AppearanceChange) => {
    const current = resumeRef.current;
    if (!current) return;
    const nextResume = updateResumeAppearance(current, change);
    resumeRef.current = nextResume;
    setResume(nextResume);
    setStyleSyncState("saving");
    setStyleError("");
    publishCommittedResume(nextResume);
    if (styleSaveTimerRef.current !== null) window.clearTimeout(styleSaveTimerRef.current);
    styleSaveTimerRef.current = window.setTimeout(() => {
      styleSaveTimerRef.current = null;
      void saveResumeById(resumeId, nextResume).then(() => {
        if (resumeRef.current === nextResume) setStyleSyncState("saved");
      }).catch((saveError: unknown) => {
        setStyleSyncState("error");
        setStyleError(saveError instanceof Error ? saveError.message : "自动保存样式失败");
      });
    }, STYLE_SAVE_DELAY_MS);
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
          {styleSyncState !== "idle" && <span className={`standalone-sync-status ${styleSyncState === "error" ? "error" : ""}`}>{styleSyncState === "saving" ? "正在自动同步…" : styleSyncState === "error" ? "同步失败" : "已自动同步"}</span>}
          <button type="button" className="primary-button" disabled={!previewResume} onClick={() => setCheckOpen(true)}>导出 PDF</button>
          <button type="button" className="secondary-button" onClick={() => window.close()}>关闭页面</button>
        </div>
      </header>
      <div
        ref={workspaceRef}
        className={`standalone-preview-workspace ${engine === "html" ? "html-standalone-workspace" : ""}`}
        style={{ "--template-gallery-width": `${galleryWidth}px` } as CSSProperties}
      >
        {previewResume && engine === "typst" && <TemplateGallery selectedId={previewResume.theme.templateId} resume={previewResume} onSelect={(templateId) => updateAppearance({ theme: { templateId } })} />}
        <div
          className={`template-gallery-resizer ${engine === "html" ? "html-gallery-hidden" : ""} ${resizingGallery ? "active" : ""}`}
          role="separator"
          aria-label="调整模板中心宽度"
          aria-orientation="vertical"
          aria-valuemin={MIN_TEMPLATE_GALLERY_WIDTH}
          aria-valuemax={Math.round(galleryMaxWidth)}
          aria-valuenow={Math.round(galleryWidth)}
          tabIndex={0}
          title="拖动调整模板中心宽度，双击恢复默认宽度"
          onPointerDown={(event) => {
            event.preventDefault();
            setResizingGallery(true);
          }}
          onDoubleClick={() => setGalleryWidth(clampTemplateGalleryWidth(DEFAULT_TEMPLATE_GALLERY_WIDTH, galleryMaxWidth))}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 50 : 20;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              setGalleryWidth((current) => clampTemplateGalleryWidth(current + (event.key === "ArrowLeft" ? -step : step), galleryMaxWidth));
            } else if (event.key === "Home") {
              event.preventDefault();
              setGalleryWidth(MIN_TEMPLATE_GALLERY_WIDTH);
            } else if (event.key === "End") {
              event.preventDefault();
              setGalleryWidth(galleryMaxWidth);
            }
          }}
        ><span aria-hidden="true" /></div>
        <section className="standalone-preview-main">
          {previewResume && (
            <div className="standalone-appearance-bar">
              <div className="standalone-template-summary"><strong>{engine === "html" ? "HTML/CSS · 经典版式" : selectedTemplate?.name}</strong><span>{engine === "html" ? "在设置中切换输出方式；Typst 模板选择已保留" : selectedTemplate?.description}</span></div>
              <label className="density-control">
                <span>紧凑</span>
                <input aria-label="独立预览排版密度" type="range" min="0" max="100" step="1" value={previewResume.theme.density} onChange={(event) => updateAppearance({ theme: { density: Number(event.target.value) } })} />
                <span>宽松</span>
                <output>{previewResume.theme.density}</output>
              </label>
              <label className="accent-picker" title="强调色"><span>配色</span><input aria-label="独立预览配色" type="color" value={previewResume.theme.accent} onChange={(event) => updateAppearance({ theme: { accent: event.target.value } })} /></label>
              <PhotoBackgroundPicker
                compact
                value={previewResume.profile.photoBackground}
                disabled={!resume?.profile.photo}
                onChange={(photoBackground) => updateAppearance({ photoBackground })}
              />
              {styleError && <span className="standalone-style-error">{styleError}</span>}
            </div>
          )}
          <div ref={viewportRef} className="standalone-preview-viewport">
            {previewResume ? <ResumePreview engine={engine} resume={previewResume} zoom={fitWidth ? "fit" : zoom} templateId={previewResume.theme.templateId} onPageCountChange={updatePageCount} /> : (
              <div className="standalone-preview-empty"><strong>{error || "正在读取简历…"}</strong>{error && <span>你可以关闭此页面并重新打开独立预览。</span>}</div>
            )}
          </div>
        </section>
      </div>
      {checkOpen && previewResume && <ResumeCheckDialog resume={previewResume} onClose={() => setCheckOpen(false)} onContinue={() => { setCheckOpen(false); setPdfResume(previewResume); }} />}
      {pdfResume && <ResumeExportDialog engine={engine} resume={pdfResume} onDownloaded={(filename) => {
        const current = resumeRef.current;
        if (!current) return;
        const next = { ...current, lastExport: exportRecord(pdfResume, filename), updatedAt: new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString() };
        acceptResume(next);
        void saveResumeById(resumeId, next).then(() => publishCommittedResume(next)).catch(() => setStyleError("PDF 已下载，但导出记录保存失败"));
      }} onClose={() => setPdfResume(null)} />}
    </main>
  );
}
