import { useEffect, useState } from "react";
import type { ResumeDocument } from "../model/resume";
import type { OutputEngine } from "../settings/appSettings";
import { savePrintJob } from "../export/htmlPrintJobs";
import { ResumePreview } from "./ResumePreview";
import { PdfExportDialog } from "./PdfExportDialog";
import { Modal } from "./Modal";

export function ResumeExportDialog(props: { engine: OutputEngine; resume: ResumeDocument; onClose: () => void; onDownloaded?: (filename: string) => void }) {
  return props.engine === "typst" ? <PdfExportDialog {...props} /> : <HtmlExportDialog resume={props.resume} onClose={props.onClose} />;
}

function HtmlExportDialog({ resume, onClose }: { resume: ResumeDocument; onClose: () => void }) {
  const [id] = useState(() => crypto.randomUUID());
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    void savePrintJob(id, resume).then((address) => { if (active) setUrl(address); }).catch(() => { if (active) setError("无法准备打印快照，请关闭此窗口后重试。"); });
    return () => { active = false; };
  }, [id, resume]);
  return <Modal titleId="html-export-title" className="pdf-export-dialog" onClose={onClose}>
    <header className="workspace-dialog-header"><div><h2 id="html-export-title">确认 HTML/CSS 排版后导出</h2><p>打印将打开独立页面，使用当前简历快照。需要调整效果时返回编辑区或独立预览。</p></div><button className="secondary-button" onClick={onClose}>返回编辑</button></header>
    <div className="pdf-preview-content"><ResumePreview engine="html" resume={resume} zoom="fit" onPageCountChange={setCount} /></div>
    <footer className="workspace-dialog-footer">
      <span role={error ? "alert" : "status"}>{error || (count ? `共 ${count} 页 · 在浏览器打印窗口选择“另存为 PDF”` : "正在准备排版…")}</span>
      {url && count > 0 && !error && <a className="primary-button" href={url} target="_blank" rel="noopener noreferrer" onClick={() => { window.setTimeout(onClose, 0); }}>打印 / 另存为 PDF ↗</a>}
    </footer>
  </Modal>;
}
