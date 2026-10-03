import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ResumeDocument } from "../model/resume";
import { getResumeTemplate } from "../templates/registry";
import { PhotoBackgroundPicker } from "./PhotoBackgroundPicker";
import { ResumePreview } from "./ResumePreview";
import { TemplateGallery } from "./TemplateGallery";
import { templatePageCountContentKey, type TemplatePageMeasurement } from "../templates/pageMeasurements";

const PAPER_WIDTH_PX = 794;
const MIN_ZOOM = 50;
const MAX_ZOOM = 140;
export const MIN_TEMPLATE_GALLERY_WIDTH = 220;
export const DEFAULT_TEMPLATE_GALLERY_WIDTH = 340;
export const MAX_TEMPLATE_GALLERY_WIDTH = 860;
const TEMPLATE_GALLERY_WIDTH_KEY = "swift-resume-template-gallery-width";


export interface AppearanceChange {
  theme?: Partial<ResumeDocument["theme"]>;
  photoBackground?: string;
}

export const clampTemplateGalleryWidth = (width: number, availableWidth = MAX_TEMPLATE_GALLERY_WIDTH) =>
  Math.min(Math.max(MIN_TEMPLATE_GALLERY_WIDTH, availableWidth), Math.max(MIN_TEMPLATE_GALLERY_WIDTH, Math.min(MAX_TEMPLATE_GALLERY_WIDTH, width)));

function readTemplateGalleryWidth() {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE_GALLERY_WIDTH;
  try {
    const stored = Number(window.localStorage.getItem(TEMPLATE_GALLERY_WIDTH_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampTemplateGalleryWidth(stored) : DEFAULT_TEMPLATE_GALLERY_WIDTH;
  } catch {
    return DEFAULT_TEMPLATE_GALLERY_WIDTH;
  }
}

export function StandalonePreview({ resume, engine, saveState, onAppearanceChange, onExport, onBack }: {
  resume: ResumeDocument;
  engine: import("../settings/appSettings").OutputEngine;
  saveState: "saving" | "saved" | "error";
  onAppearanceChange: (change: AppearanceChange) => void;
  onExport: () => void;
  onBack: () => void;
}) {
  const [pageMeasurement, setPageMeasurement] = useState<TemplatePageMeasurement | null>(null);
  const [fitWidth, setFitWidth] = useState(true);
  const [manualZoom, setManualZoom] = useState(100);
  const [fitZoom, setFitZoom] = useState(100);
  const [galleryWidth, setGalleryWidth] = useState(readTemplateGalleryWidth);
  const [galleryMaxWidth, setGalleryMaxWidth] = useState(MAX_TEMPLATE_GALLERY_WIDTH);
  const [resizingGallery, setResizingGallery] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

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
      if (!workspace.clientWidth) return; // Keep the chosen width while this screen is hidden.
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

  const zoom = fitWidth ? fitZoom : manualZoom;
  const title = useMemo(() => resume.title || "模板与预览", [resume.title]);
  const previewResume = resume;
  const selectedTemplate = resume ? getResumeTemplate(resume.theme.templateId) : null;

  const adjustZoom = (delta: number) => {
    setFitWidth(false);
    setManualZoom((current) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + delta)));
  };
  const contentKey = previewResume ? templatePageCountContentKey(previewResume) : "";
  const templateId = previewResume?.theme.templateId;
  const currentPageCount = pageMeasurement?.contentKey === contentKey && pageMeasurement.templateId === templateId && pageMeasurement.engine === engine ? pageMeasurement.pageCount : null;
  const updatePageCount = useCallback((value: number) => {
    if (!templateId || !Number.isSafeInteger(value) || value < 1) return;
    setPageMeasurement((current) => current?.contentKey === contentKey && current.templateId === templateId && current.engine === engine && current.pageCount === value
      ? current : { contentKey, templateId, engine, pageCount: value });
  }, [contentKey, templateId, engine]);
  const updateAppearance = onAppearanceChange;

  return (
    <main className="standalone-preview">
      <header className="standalone-preview-toolbar">
        <div className="standalone-preview-brand">
          <img src="./icons/icon32.png" alt="" />
          <div><strong>SwiftResume</strong><span>{title}</span></div>
          {previewResume && <span className="page-count-badge">{currentPageCount ? `共 ${currentPageCount} 页` : "排版中…"}</span>}
        </div>
        <div className="standalone-preview-actions">
          <button type="button" className={`secondary-button ${fitWidth ? "active" : ""}`} onClick={() => setFitWidth(true)}>适应宽度</button>
          <div className="standalone-zoom-control" aria-label="预览缩放">
            <button type="button" aria-label="缩小预览" onClick={() => adjustZoom(-10)}>−</button>
            <output>{zoom}%</output>
            <button type="button" aria-label="放大预览" onClick={() => adjustZoom(10)}>＋</button>
          </div>
          <span role="status" className={`standalone-sync-status ${saveState === "error" ? "error" : ""}`}>{saveState === "saving" ? "保存中…" : saveState === "error" ? "保存失败，请返回编辑重试" : "已自动保存"}</span>
          <button type="button" className="primary-button" disabled={!previewResume} onClick={onExport}>{engine === "html" ? "打印 / 保存 PDF" : "下载 PDF"}</button>
          <button type="button" className="secondary-button" onClick={onBack}>返回编辑</button>
        </div>
      </header>
      <div
        ref={workspaceRef}
        className="standalone-preview-workspace"
        style={{ "--template-gallery-width": `${galleryWidth}px` } as CSSProperties}
      >
        {previewResume && <TemplateGallery pageMeasurement={pageMeasurement} engine={engine} selectedId={previewResume.theme.templateId} resume={previewResume} onSelect={(templateId) => updateAppearance({ theme: { templateId } })} />}
        <div
          className={`template-gallery-resizer ${resizingGallery ? "active" : ""}`}
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
              <div className="standalone-template-summary"><strong>{selectedTemplate?.name}</strong><span>{selectedTemplate?.description}</span></div>
              <label className="density-control">
                <span>紧凑</span>
                <input aria-label="模板预览排版密度" type="range" min="0" max="100" step="1" value={previewResume.theme.density} onChange={(event) => updateAppearance({ theme: { density: Number(event.target.value) } })} />
                <span>宽松</span>
                <output>{previewResume.theme.density}</output>
              </label>
              <label className="accent-picker" title="强调色"><span>配色</span><input aria-label="模板预览配色" type="color" value={previewResume.theme.accent} onChange={(event) => updateAppearance({ theme: { accent: event.target.value } })} /></label>
              <PhotoBackgroundPicker
                compact
                value={previewResume.profile.photoBackground}
                disabled={!resume?.profile.photo}
                onChange={(photoBackground) => updateAppearance({ photoBackground })}
              />
            </div>
          )}
          <div ref={viewportRef} className="standalone-preview-viewport">
            {previewResume ? <ResumePreview engine={engine} resume={previewResume} zoom={fitWidth ? "fit" : zoom} templateId={previewResume.theme.templateId} onPageCountChange={updatePageCount} /> : (
              <div className="standalone-preview-empty"><strong>正在读取简历…</strong></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
