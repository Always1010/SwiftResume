import { shortcut } from "../keyboardShortcuts";
import { AppIcon, BrandMark } from "./AppIcon";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ResumeDocument } from "../model/resume";
import { getResumeTemplate } from "../templates/registry";
import { PreviewControls, type AppearanceChange } from "./PreviewControls";
import type { PreviewZoom } from "../settings/appSettings";
import { ResumePreview } from "./ResumePreview";
import { TemplateGallery } from "./TemplateGallery";
import { templatePageCountContentKey, type TemplatePageMeasurement } from "../templates/pageMeasurements";

export const MIN_TEMPLATE_GALLERY_WIDTH = 220;
export const DEFAULT_TEMPLATE_GALLERY_WIDTH = 340;
export const MAX_TEMPLATE_GALLERY_WIDTH = 860;
const TEMPLATE_GALLERY_WIDTH_KEY = "swift-resume-template-gallery-width";


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

export function StandalonePreview({ active = true, resume, zoom, onZoomChange, engine, saveState, onAppearanceChange, onExport, onBack }: {
  active?: boolean;
  zoom: PreviewZoom;
  onZoomChange: (zoom: PreviewZoom) => void;
  resume: ResumeDocument;
  engine: import("../settings/appSettings").OutputEngine;
  saveState: "saving" | "saved" | "error";
  onAppearanceChange: (change: AppearanceChange) => void;
  onExport: () => void;
  onBack: () => void;
}) {
  const [pageMeasurement, setPageMeasurement] = useState<TemplatePageMeasurement | null>(null);
  const [galleryWidth, setGalleryWidth] = useState(readTemplateGalleryWidth);
  const [galleryMaxWidth, setGalleryMaxWidth] = useState(MAX_TEMPLATE_GALLERY_WIDTH);
  const [resizingGallery, setResizingGallery] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

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

  const title = useMemo(() => resume.title || "模板与预览", [resume.title]);
  const previewResume = resume;
  const selectedTemplate = resume ? getResumeTemplate(resume.theme.templateId) : null;

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
        <div className="standalone-preview-leading">
          <button type="button" className="secondary-button standalone-back-button" title="返回内容编辑，保留修改与编辑位置" onClick={onBack}><AppIcon name="arrowLeft" />返回编辑</button>
          <div className="standalone-preview-brand">
          <BrandMark />
          <div><strong>模板与预览</strong><span>{title}</span></div>
          {previewResume && <span className="page-count-badge">{currentPageCount ? `共 ${currentPageCount} 页` : "排版中…"}</span>}
          </div>
        </div>
        <div className="standalone-preview-actions">
          <span role="status" className={`standalone-sync-status ${saveState === "error" ? "error" : ""}`}>{saveState === "saving" ? "保存中…" : saveState === "error" ? "保存失败，请返回编辑重试" : "已自动保存"}</span>
          <button type="button" className="primary-button" title={`打开导出预览（${shortcut("Mod+P").label}）`} aria-keyshortcuts={shortcut("Mod+P").aria} disabled={!previewResume} onClick={onExport}><AppIcon name="download" />{engine === "html" ? "打印 / 保存 PDF" : "下载 PDF"}</button>
        </div>
      </header>
      <div
        ref={workspaceRef}
        className="standalone-preview-workspace"
        style={{ "--template-gallery-width": `${galleryWidth}px` } as CSSProperties}
      >
        {previewResume && <TemplateGallery active={active} pageMeasurement={pageMeasurement} engine={engine} selectedId={previewResume.theme.templateId} resume={previewResume} onSelect={(templateId) => updateAppearance({ theme: { templateId } })} />}
        <div
          className={`template-gallery-resizer ${resizingGallery ? "active" : ""}`}
          role="separator"
          aria-label="调整模板中心宽度"
          aria-orientation="vertical"
          aria-valuemin={MIN_TEMPLATE_GALLERY_WIDTH}
          aria-valuemax={Math.round(galleryMaxWidth)}
          aria-valuenow={Math.round(galleryWidth)}
          tabIndex={0}
          title="拖动调整模板中心宽度，双击恢复默认宽度；聚焦后按 ← / → 调整，Shift + ← / → 大幅调整，Home / End 最小 / 最大宽度"
          aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Home End"
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
              <div className="standalone-template-summary"><small>当前模板</small><strong>{selectedTemplate?.name}</strong><span>{selectedTemplate?.description}</span></div>
              <PreviewControls resume={resume} zoom={zoom} onZoomChange={onZoomChange} onAppearanceChange={updateAppearance} />
            </div>
          )}
          <div className="standalone-preview-viewport">
            {previewResume ? <ResumePreview active={active} engine={engine} resume={previewResume} zoom={zoom} templateId={previewResume.theme.templateId} onPageCountChange={updatePageCount} /> : (
              <div className="standalone-preview-empty"><strong>正在读取简历…</strong></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
