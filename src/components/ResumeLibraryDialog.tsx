import { AppIcon } from "./AppIcon";
import { useEffect, useRef, useState } from "react";
import type { ResumeLibrary, ResumeSummary } from "../storage/resumeStorage";
import { Modal } from "./Modal";
import { CloseButton } from "./CloseButton";

export function filterResumeSummaries(rows: ResumeSummary[], query: string) {
  const term = query.trim().toLocaleLowerCase();
  return rows.filter((row) => row.title.toLocaleLowerCase().includes(term))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function ResumeLibraryDialog({ library, onClose, onNew, onOpen, onRename, onCopy, onDelete, onClear }: {
  library: ResumeLibrary;
  onClose: () => void;
  onNew: () => void;
  onOpen: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onCopy: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const renameInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rows = filterResumeSummaries(library.resumes, query);
  useEffect(() => { renameInput.current?.focus(); renameInput.current?.select(); }, [renaming?.id]);
  const run = async (operation: () => Promise<void>, done?: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(""); setMessage("");
    try { await operation(); if (done) setMessage(done); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败，请重试"); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const close = () => { if (!busyRef.current) onClose(); };
  return <Modal titleId="resume-library-title" className="flow-dialog resume-library-dialog" onClose={close}>
    <header className="workspace-dialog-header library-header">
      <div><h2 id="resume-library-title">我的简历</h2><p>{library.resumes.length} 份简历</p></div>
      <div className="library-header-actions">
        <button type="button" className="primary-button" disabled={busy} onClick={onNew}><AppIcon name="plus" />新建简历</button>
        <CloseButton disabled={busy} onClick={close} label="关闭我的简历" />
      </div>
    </header>
      <div className="library-search"><AppIcon name="search" /><input type="search" aria-label="搜索简历" placeholder="搜索简历名称" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" className="text-button" onClick={() => setQuery("")}>清除搜索</button>}</div>
      <ul className="library-list" aria-label="简历列表">{rows.map((row) => {
        const current = row.id === library.activeResumeId;
        const editingName = renaming?.id === row.id;
        return <li className={`library-row ${current ? "current" : ""}`} key={row.id}>
          {editingName ? <form className="library-rename" onSubmit={(event) => {
            event.preventDefault();
            const title = renaming.title.trim();
            if (title && title !== row.title) void run(async () => { await onRename(row.id, title); setRenaming(null); }, "名称已保存");
          }}>
            <input ref={renameInput} aria-label={`重命名 ${row.title}`} value={renaming.title} disabled={busy} onChange={(event) => setRenaming({ id: row.id, title: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setRenaming(null); } }} />
            <button type="submit" className="primary-button" disabled={busy || !renaming.title.trim() || renaming.title.trim() === row.title}>保存</button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => setRenaming(null)}>取消</button>
          </form> : <>
            <button type="button" className="library-row-main" disabled={busy} aria-label={`${current ? "继续编辑" : "打开编辑"}：${row.title || "未命名简历"}`} onClick={() => void run(async () => { await onOpen(row.id); onClose(); })}>
              <span className="library-document-icon"><AppIcon name="document" /></span><span className="library-row-title"><strong>{row.title || "未命名简历"}</strong>{current && <small>当前</small>}</span>
              <time dateTime={row.updatedAt}>修改于 {new Date(row.updatedAt).toLocaleString()}</time>
            </button>
            <div className="library-row-actions">
              <button type="button" className="secondary-button" disabled={busy} aria-label={`创建副本：${row.title}`} onClick={() => void run(async () => { await onCopy(row.id); onClose(); })}><AppIcon name="copy" />创建副本</button>
              <button type="button" className="icon-button" disabled={busy} aria-label={`更多操作：${row.title}`} aria-expanded={menuId === row.id} onClick={() => setMenuId(menuId === row.id ? null : row.id)}><AppIcon name="more" /></button>
            </div>
          </>}
          {menuId === row.id && !editingName && <div className="library-row-menu" role="group" aria-label={`${row.title}的更多操作`}>
            <button type="button" className="text-button" disabled={busy} onClick={() => { setMenuId(null); setRenaming({ id: row.id, title: row.title }); }}>重命名</button>
            {current && <button type="button" className="text-button" disabled={busy} onClick={() => { onClose(); onClear(); }}>清空内容，保留结构</button>}
            <button type="button" className="text-button danger-text" disabled={busy || library.resumes.length <= 1} onClick={() => void run(() => onDelete(row.id))}>删除</button>
          </div>}
        </li>;
      })}</ul>
      {!rows.length && <div className="library-empty"><strong>{query ? "没有找到这份简历" : "还没有简历"}</strong><p>{query ? "试试其他名称，或清除搜索。" : "点击右上角“新建简历”开始。"}</p></div>}
    {(busy || message) && <p className="library-feedback" role="status">{busy ? "正在保存…" : message}</p>}
    {error && <p role="alert" className="danger-text">{error}</p>}
  </Modal>;
}
