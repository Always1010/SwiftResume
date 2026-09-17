import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { GeneratedPdf } from "../export/typstPdf";
import { getPdfArtifact } from "../export/pdfArtifact";
import type { ResumeDocument } from "../model/resume";
import { Modal } from "./Modal";

const PdfCanvasPreview = lazy(() => import("./PdfCanvasPreview"));

export function PdfExportDialog({ resume, onClose, onDownloaded }: {
  resume: ResumeDocument;
  onClose: () => void;
  onDownloaded?: (filename: string) => void;
}) {
  const [pdf, setPdf] = useState<(GeneratedPdf & { url: string }) | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef<{ resume: ResumeDocument; attempt: number; promise: Promise<GeneratedPdf> } | null>(null);
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    setPdf(null);
    setError("");
    if (requestRef.current?.resume !== resume || requestRef.current.attempt !== attempt) {
      requestRef.current = { resume, attempt, promise: getPdfArtifact(resume) };
    }
    requestRef.current.promise.then((result) => {
      if (!active) return;
      url = URL.createObjectURL(result.blob);
      setPdf({ ...result, url });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "无法生成 PDF，请重试。");
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [resume, attempt]);

  return <Modal titleId="pdf-export-title" className="pdf-export-dialog" onClose={onClose}>
    <header className="workspace-dialog-header">
      <div><h2 id="pdf-export-title">确认 PDF 后下载</h2><p>{resume.title || "未命名简历"} · 预览、下载与打印使用同一份 PDF；打印将在新标签页打开，请使用阅读器的打印按钮</p></div>
      <button type="button" className="secondary-button" onClick={onClose}>返回编辑</button>
    </header>
    <div className="pdf-preview-content" aria-busy={!pdf && !error}>
      {pdf ? <Suspense fallback={<div className="pdf-export-message" role="status">正在打开 PDF…</div>}><PdfCanvasPreview blob={pdf.blob} /></Suspense> : error ?
        <div className="pdf-export-message" role="alert"><h3>暂时无法生成 PDF</h3><p>请重新生成，生成成功后再下载或打印。</p><details><summary>查看错误详情</summary><pre>{error}</pre></details><button type="button" className="primary-button" onClick={() => setAttempt((value) => value + 1)}>重新生成</button></div> :
        <div className="pdf-export-message" role="status"><span className="pdf-loading-spinner" aria-hidden="true" /><h3>正在生成最终 PDF…</h3><p>首次生成需要加载本地字体，请稍候。</p></div>}
    </div>
    <footer className="workspace-dialog-footer">
      <span>{pdf ? `PDF 已生成 · ${Math.max(1, Math.round(pdf.blob.size / 1024))} KB` : "生成和预览均在本机完成"}</span>
      {pdf && <a className="secondary-button" href={pdf.url} target="_blank" rel="noopener noreferrer" title="打开同一份 PDF，使用阅读器的打印按钮或 Ctrl/Cmd + P">打印 PDF ↗</a>}
      {pdf && <a className="primary-button" href={pdf.url} download={pdf.filename} onClick={() => onDownloaded?.(pdf.filename)}>下载 PDF</a>}
    </footer>
  </Modal>;
}
