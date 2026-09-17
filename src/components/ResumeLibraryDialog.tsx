import { useEffect, useState, type ReactNode } from "react";
import type { ResumeLibrary, ResumeSummary } from "../storage/resumeStorage";
import { Modal } from "./Modal";

export function filterResumeSummaries(rows: ResumeSummary[], query: string) {
  const term = query.trim().toLocaleLowerCase();
  return rows.filter((row) => [row.title, row.company, row.role].filter(Boolean).join(" ").toLocaleLowerCase().includes(term))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function ResumeLibraryDialog({ library, onClose, onNew, onOpen, onRename, onCopy, onDelete, onClear, backupTools }: {
  library: ResumeLibrary;
  onClose: () => void;
  onNew: () => void;
  onOpen: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onCopy: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClear: () => void;
  backupTools: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"documents" | "backup">("documents");
  const [selectedId, setSelectedId] = useState(library.activeResumeId);
  const selected = library.resumes.find((row) => row.id === selectedId) ?? library.resumes.find((row) => row.id === library.activeResumeId)!;
  const [title, setTitle] = useState(selected.title);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rows = filterResumeSummaries(library.resumes, query);
  useEffect(() => { setTitle(selected.title); setMessage(""); setError(""); }, [selected.id, selected.title]);
  const run = async (operation: () => Promise<void>, done?: string) => {
    setBusy(true); setError(""); setMessage("");
    try { await operation(); if (done) setMessage(done); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败，请重试"); }
    finally { setBusy(false); }
  };
  return <Modal titleId="resume-library-title" className="flow-dialog resume-library-dialog" onClose={() => { if (!busy) onClose(); }}>
    <header className="workspace-dialog-header"><div><span className="eyebrow">简历工作台</span><h2 id="resume-library-title">我的简历</h2><p>{library.resumes.length} 份简历 · 为不同机会保留独立版本</p></div><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>关闭</button></header>
    <div className="library-tabs" role="group" aria-label="简历管理分类"><button type="button" aria-pressed={tab === "documents"} onClick={() => setTab("documents")}>我的简历</button><button type="button" aria-pressed={tab === "backup"} onClick={() => setTab("backup")}>导入与备份</button></div>
    {tab === "documents" ? <>
      <div className="library-search"><input aria-label="搜索简历" placeholder="搜索简历名称、公司或岗位" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" className="primary-button" disabled={busy} onClick={onNew}>＋ 新建简历</button></div>
      <div className="library-content"><div className="library-list" aria-label="简历列表">{rows.map((row) => <button type="button" key={row.id} disabled={busy} className={`library-row ${selected.id === row.id ? "selected" : ""}`} aria-pressed={selected.id === row.id} onClick={() => setSelectedId(row.id)}>
        <span className="library-row-title"><strong>{row.title || "未命名简历"}</strong>{row.id === library.activeResumeId && <small>当前编辑</small>}</span>
        <span>{[row.company, row.role].filter(Boolean).join(" · ") || "尚未设置目标岗位"}</span><time>修改于 {new Date(row.updatedAt).toLocaleString()}</time>
      </button>)}{!rows.length && <p className="library-empty">没有找到匹配的简历，试试其他关键词。</p>}</div>
      <section className="library-detail" aria-label="所选简历操作"><span className="eyebrow">所选简历</span><h3>{selected.title || "未命名简历"}</h3>
        <label className="flow-field">简历名称<input value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && title.trim() && title.trim() !== selected.title) void run(() => onRename(selected.id, title.trim()), "名称已保存"); }} /></label>
        <button type="button" className="secondary-button" disabled={busy || !title.trim() || title.trim() === selected.title} onClick={() => void run(() => onRename(selected.id, title.trim()), "名称已保存")}>保存名称</button>
        <div className="library-detail-actions"><button type="button" className="primary-button" disabled={busy} onClick={() => void run(async () => { await onOpen(selected.id); onClose(); })}>{selected.id === library.activeResumeId ? "继续编辑" : "打开编辑"}</button><button type="button" className="secondary-button" disabled={busy} onClick={() => void run(async () => { await onCopy(selected.id); onClose(); })}>创建副本</button></div>
        <details className="library-more"><summary>更多操作</summary>{selected.id === library.activeResumeId && <button type="button" className="text-button" disabled={busy} onClick={() => { onClose(); onClear(); }}>清空内容，保留结构</button>}<button type="button" className="text-button danger-text" disabled={busy || library.resumes.length <= 1} onClick={() => void run(() => onDelete(selected.id))}>删除这份简历</button><small>删除前会再次确认。至少保留一份简历。</small></details>
      </section></div>
    </> : <section className="library-backup"><h3>导入与备份</h3><p>备份可用于迁移或留档。导入时可以勾选简历，并恢复为新副本。</p>{backupTools}</section>}
    <div className="library-feedback" aria-live="polite">{busy ? "正在保存，请稍候…" : message}</div>{error && <p role="alert" className="danger-text">{error}</p>}
  </Modal>;
}
