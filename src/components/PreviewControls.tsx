import { AppIcon } from "./AppIcon";
import { PhotoBackgroundPicker } from "./PhotoBackgroundPicker";
import { PreviewZoomControls } from "./PreviewZoomControls";
import type { ResumeDocument } from "../model/resume";
import type { PreviewZoom } from "../settings/appSettings";

export interface AppearanceChange {
  theme?: Partial<ResumeDocument["theme"]>;
  photoBackground?: string;
}

/** Both workspace views edit the same App-owned document and display preference. */
export function PreviewControls({ resume, zoom, onZoomChange, onAppearanceChange }: {
  resume: ResumeDocument;
  zoom: PreviewZoom;
  onZoomChange: (zoom: PreviewZoom) => void;
  onAppearanceChange: (change: AppearanceChange) => void;
}) {
  return <div className="preview-display-controls">
    <PreviewZoomControls zoom={zoom} onChange={onZoomChange} />
    <details className="standalone-appearance-options"><summary><AppIcon name="settings" />排版设置<AppIcon name="chevron" /></summary>
      <div className="standalone-appearance-fields">
        <label className="density-control"><span>紧凑</span><input aria-label="预览排版密度" type="range" min="0" max="100" step="1" value={resume.theme.density} onChange={(event) => onAppearanceChange({ theme: { density: Number(event.target.value) } })} /><span>宽松</span><output>{resume.theme.density}</output></label>
        <label className="accent-picker" title="强调色"><span>配色</span><input aria-label="预览配色" type="color" value={resume.theme.accent} onChange={(event) => onAppearanceChange({ theme: { accent: event.target.value } })} /></label>
        <PhotoBackgroundPicker compact value={resume.profile.photoBackground} disabled={!resume.profile.photo} onChange={(photoBackground) => onAppearanceChange({ photoBackground })} />
      </div>
    </details>
  </div>;
}
