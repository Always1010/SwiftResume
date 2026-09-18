import { useState } from "react";
import type { ResumeDocument } from "../model/resume";
import { getResumeTemplate } from "../templates/registry";
import { Modal } from "./Modal";
import { ResumePreview } from "./ResumePreview";
import { TemplateGallery } from "./TemplateGallery";
import type { OutputEngine } from "../settings/appSettings";

export function TemplatePickerDialog({ resume, onApply, onClose, engine = "typst" }: {
  engine?: OutputEngine;
  resume: ResumeDocument;
  onApply: (theme: ResumeDocument["theme"]) => void;
  onClose: () => void;
}) {
  const [theme, setTheme] = useState(resume.theme);
  const [pageCount, setPageCount] = useState(1);
  const preview = { ...resume, theme };
  return <Modal titleId="template-picker-title" className="template-picker-dialog" onClose={onClose}>
    <header className="workspace-dialog-header">
      <div><h2 id="template-picker-title">为你的简历选择样式</h2><p>用真实内容试用模板，点击“应用样式”后才会保存。</p></div>
      <button type="button" className="secondary-button" onClick={onClose} aria-label="关闭模板选择">关闭</button>
    </header>
    <div className="template-picker-body">
      {engine === "typst" ? <TemplateGallery resume={preview} selectedId={theme.templateId} onSelect={(templateId) => setTheme((current) => ({ ...current, templateId }))} /> : <aside className="html-template-notice"><strong>HTML/CSS · 经典版式</strong><p>可在右侧调节密度和配色。其他模板可切换为 Typst 后使用，原来的模板选择会保留。</p></aside>}
      <section className="template-picker-preview" aria-label="试用效果">
        <div className="preview-toolbar">
          <strong>{engine === "html" ? "HTML/CSS · 经典版式" : getResumeTemplate(theme.templateId).name}</strong>
          <span className="page-count-badge">预览 {pageCount} 页</span>
          <label className="density-control"><span>紧凑</span><input type="range" min="0" max="100" aria-label="试用排版密度" value={theme.density} onChange={(event) => {
            const density = Number(event.target.value);
            setTheme((current) => ({ ...current, density }));
          }} /><span>宽松</span><output>{theme.density}</output></label>
          <label className="accent-picker">配色<input type="color" aria-label="试用配色" value={theme.accent} onChange={(event) => {
            const accent = event.target.value;
            setTheme((current) => ({ ...current, accent }));
          }} /></label>
        </div>
        <ResumePreview engine={engine} resume={preview} zoom="fit" onPageCountChange={setPageCount} />
      </section>
    </div>
    <footer className="workspace-dialog-footer">
      <span>正在试用 · 尚未更改简历</span>
      <button type="button" className="secondary-button" onClick={onClose}>取消</button>
      <button type="button" className="primary-button" onClick={() => onApply(theme)}>应用样式</button>
    </footer>
  </Modal>;
}
