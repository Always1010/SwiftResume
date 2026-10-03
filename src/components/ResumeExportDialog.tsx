import { useEffect, useState, type ReactNode } from "react";
import type { ResumeDocument } from "../model/resume";
import { checkResume } from "../model/resumeChecks";
import type { OutputEngine } from "../settings/appSettings";
import { savePrintJob } from "../export/htmlPrintJobs";
import { ResumePreview } from "./ResumePreview";
import { PdfExportDialog } from "./PdfExportDialog";
import { Modal } from "./Modal";

interface ResumeExportDialogProps {
  engine: OutputEngine;
  resume: ResumeDocument;
  onClose: () => void;
  onLocate?: (id: string) => void;
}

export function ResumeExportDialog({ engine, resume, onClose, onLocate }: ResumeExportDialogProps) {
  const issues = checkResume(resume);
  const checks = issues.length ? <details className="export-content-checks">
    <summary>{issues.length} 项内容待检查 · 请确认后再导出</summary>
    <ul className="flow-list">{issues.map((issue) => <li key={issue.id}>{issue.message}{onLocate && <button type="button" className="text-button" onClick={() => onLocate(issue.sectionId)}>定位修改</button>}</li>)}</ul>
    <p>提示仅供参考，确认内容无误后仍可继续。</p>
  </details> : <p role="status">内容检查通过，请确认分页与版式。</p>;
  return engine === "typst"
    ? <PdfExportDialog resume={resume} onClose={onClose} checks={checks} />
    : <HtmlExportDialog resume={resume} onClose={onClose} checks={checks} />;
}

function HtmlExportDialog({ resume, onClose, checks }: Omit<ResumeExportDialogProps, "engine" | "onLocate"> & { checks: ReactNode }) {
  const [job, setJob] = useState<{ url: string; resume: ResumeDocument } | null>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setJob(null);
    setError("");
    void savePrintJob(crypto.randomUUID(), resume).then((url) => { if (active) setJob({ url, resume }); }).catch(() => { if (active) setError("无法准备打印快照，请关闭此窗口后重试。"); });
    return () => { active = false; };
  }, [resume]);
  return <Modal titleId="html-export-title" className="pdf-export-dialog" onClose={onClose}>
    <header className="workspace-dialog-header"><div><h2 id="html-export-title">打印 / 保存 PDF</h2><p>下一步打开浏览器打印窗口，选择“另存为 PDF”。</p>{checks}<details><summary>打印设置与保存说明</summary><p>A4 · 缩放 100% · 无边距 · 关闭页眉页脚 · 开启背景图形。最终保存由浏览器控制，应用无法确认文件是否保存。</p></details></div><button type="button" className="secondary-button" onClick={onClose}>返回编辑</button></header>
    <div className="pdf-preview-content"><ResumePreview engine="html" resume={resume} zoom="fit" onPageCountChange={setCount} onReadyChange={setReady} /></div>
    <footer className="workspace-dialog-footer">
      <span role={error ? "alert" : "status"}>{error || (job?.resume === resume && ready && count > 0 ? `打印快照已准备 · 共 ${count} 页` : "正在准备排版…")}</span>
      {job?.resume === resume && ready && count > 0 && !error && <a className="primary-button" href={job.url} target="_blank" rel="noopener noreferrer" onClick={() => {
        window.setTimeout(onClose, 0);
      }}>打印 / 保存 PDF ↗</a>}
    </footer>
  </Modal>;
}
