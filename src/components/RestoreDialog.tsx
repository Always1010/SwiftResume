import { useState } from "react";
import type { ImportBatch, ImportDocument } from "../storage/libraryBackup";
import { plainText } from "../model/writingGuide";
import { Modal } from "./Modal";
export function RestoreDialog({ batch, onClose, onRestore }: { batch: ImportBatch; onClose: () => void; onRestore: (documents: ImportDocument[]) => Promise<void> }) {
  const [selected, setSelected] = useState(batch.documents.map((d) => d.id));
  const [previewId, setPreviewId] = useState(batch.documents[0]?.id);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const preview = batch.documents.find((d) => d.id === previewId)?.resume;
  return <Modal titleId="restore-title" className="flow-dialog" onClose={() => !busy && onClose()}>
    <h2 id="restore-title">选择要恢复的简历</h2><p>所选简历将作为新副本加入当前简历库，现有内容保持不变。</p>
    {batch.skipped.length > 0 && <div role="alert"><strong>有 {batch.skipped.length} 项未通过校验：</strong>{batch.skipped.map((message) => <p key={message}>{message}</p>)}</div>}
    <div className="flow-actions"><button className="secondary-button" onClick={() => setSelected(batch.documents.map((d) => d.id))}>全选</button><button className="secondary-button" onClick={() => setSelected([])}>取消全选</button></div>
    <ul className="flow-list">{batch.documents.map((item) => <li key={item.id}><label className="restore-choice"><input type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />{item.resume.title || "未命名简历"} · {item.resume.sections.length} 个模块</label><button className="secondary-button" onClick={() => setPreviewId(item.id)}>查看此份内容</button></li>)}</ul>
    {preview && <details open key={previewId}><summary>内容预览：{preview.title}</summary><p>{[preview.profile.name, preview.profile.headline, preview.profile.phone, preview.profile.email].filter(Boolean).join(" · ")}</p>{preview.sections.map((s) => <div key={s.id}><strong>{s.title}{!s.enabled && "（隐藏）"}</strong><pre className="import-text">{s.type === "content" ? s.entries.map((e) => [e.title, e.subtitle, e.date, plainText(e.body)].filter(Boolean).join("\n")).join("\n\n") : s.items.map((e) => [e.school, e.major, e.degree, e.date, e.detail].join("\n")).join("\n\n")}</pre></div>)}</details>}
    {error && <p className="flow-error" role="alert">{error}</p>}
    <div className="flow-actions"><button className="secondary-button" disabled={busy} onClick={onClose}>取消</button><button className="primary-button" disabled={busy || !selected.length} onClick={() => { setBusy(true); setError(""); void onRestore(batch.documents.filter((d) => selected.includes(d.id))).catch((e) => setError(e instanceof Error ? e.message : "恢复失败")).finally(() => setBusy(false)); }}>{busy ? "正在恢复…" : `恢复所选 ${selected.length} 份`}</button></div>
  </Modal>;
}
