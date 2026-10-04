import { useRef, useState } from "react";
import type { ResumeDocument } from "../model/resume";
import type { OutputEngine } from "../settings/appSettings";
import { printHtmlInPlace } from "../export/printInPlace";
import { ResumePreview } from "./ResumePreview";
import { PdfExportDialog } from "./PdfExportDialog";
import { Modal } from "./Modal";
import { CloseButton } from "./CloseButton";

interface ResumeExportDialogProps {
  engine: OutputEngine;
  resume: ResumeDocument;
  onClose: () => void;
  returnLabel?: string;
}

export function ResumeExportDialog({ engine, resume, onClose, returnLabel }: ResumeExportDialogProps) {
  return engine === "typst"
    ? <PdfExportDialog resume={resume} onClose={onClose} returnLabel={returnLabel} />
    : <HtmlExportDialog resume={resume} onClose={onClose} returnLabel={returnLabel} />;
}

function HtmlExportDialog({ resume, onClose, returnLabel = "返回编辑" }: Omit<ResumeExportDialogProps, "engine">) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  return <Modal titleId="html-export-title" className="pdf-export-dialog" onClose={onClose}>
    <header className="workspace-dialog-header"><div><h2 id="html-export-title">打印 / 保存 PDF</h2><p>下一步打开浏览器打印窗口，选择“另存为 PDF”。</p><details><summary>打印设置与保存说明</summary><p>A4 · 缩放 100% · 无边距 · 关闭页眉页脚 · 开启背景图形。最终保存由浏览器控制，应用无法确认文件是否保存。</p></details></div><CloseButton onClick={onClose} label={returnLabel} /></header>
    <div ref={previewRef} className="pdf-preview-content"><ResumePreview engine="html" resume={resume} zoom="fit" onPageCountChange={setCount} onReadyChange={setReady} /></div>
    <footer className="workspace-dialog-footer">
      <span role={error ? "alert" : "status"}>{error || (ready && count > 0 ? `打印快照已准备 · 共 ${count} 页` : "正在准备排版…")}</span>
      <button type="button" className="primary-button" disabled={!ready || count < 1} onClick={() => {
        if (!previewRef.current) return;
        setError("");
        try { printHtmlInPlace(previewRef.current, resume.title); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "无法打开打印窗口，请重试。"); }
      }}>打印 / 保存 PDF</button>
    </footer>
  </Modal>;
}
