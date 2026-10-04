import { useEffect, useRef, useState } from "react";
import { MAX_PREVIEW_ZOOM, MIN_PREVIEW_ZOOM, type PreviewZoom } from "../settings/appSettings";

const displayValue = (zoom: PreviewZoom) => zoom === "fit" ? "" : String(zoom);
const clamp = (value: number) => Math.max(MIN_PREVIEW_ZOOM, Math.min(MAX_PREVIEW_ZOOM, Math.round(value)));

/** Display scale only. Does not change resume density, pagination or export size. */
export function PreviewZoomControls({ zoom, onChange }: { zoom: PreviewZoom; onChange: (zoom: PreviewZoom) => void }) {
  const [draft, setDraft] = useState(() => displayValue(zoom));
  const composing = useRef(false);
  useEffect(() => setDraft(displayValue(zoom)), [zoom]);
  const commit = (value: string) => {
    if (composing.current) return;
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number)) { setDraft(displayValue(zoom)); return; }
    const next = clamp(number);
    setDraft(String(next));
    if (next !== zoom) onChange(next);
  };
  const step = (delta: number) => {
    const base = draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : zoom === "fit" ? 100 : zoom;
    const next = clamp(base + delta);
    setDraft(String(next)); onChange(next);
  };
  return <div className="preview-zoom-controls" role="group" aria-label="预览缩放">
    <div className="preview-zoom-stepper">
      <button type="button" aria-label="缩小预览" title="缩小预览 10%" disabled={zoom === MIN_PREVIEW_ZOOM} onClick={() => step(-10)}>−</button>
      <label className="preview-zoom-value">
        <input type="number" min={MIN_PREVIEW_ZOOM} max={MAX_PREVIEW_ZOOM} step="1" value={draft} placeholder="自动" aria-label="预览缩放百分比" title="50%–140%；适应宽度时自动跟随可用空间，输入数字切换为固定比例" onChange={(event) => setDraft(event.target.value)} onBlur={(event) => commit(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={(event) => {
          if (composing.current || event.nativeEvent.isComposing) return;
          if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value); }
          else if (event.key === "Escape") { event.preventDefault(); setDraft(displayValue(zoom)); }
          else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const base = draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : zoom === "fit" ? 100 : zoom;
            commit(String(base + (event.key === "ArrowUp" ? 1 : -1)));
          }
        }} /><span aria-hidden="true">%</span>
      </label>
      <button type="button" aria-label="放大预览" title="放大预览 10%" disabled={zoom === MAX_PREVIEW_ZOOM} onClick={() => step(10)}>＋</button>
    </div>
    <button type="button" className={`secondary-button ${zoom === "fit" ? "active" : ""}`} aria-pressed={zoom === "fit"} title="按当前预览区域自动适应宽度，不改变打印版式" onClick={() => { setDraft(""); onChange("fit"); }}>适应宽度</button>
  </div>;
}
