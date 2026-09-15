import { useEffect, useState } from "react";
import type { ResumeDocument } from "../model/resume";
import { deleteHistorySnapshot, listHistorySnapshots, type HistorySnapshot } from "../storage/diskBackup";
import type { ResumeSummary } from "../storage/resumeStorage";
import { ResumePreview } from "./ResumePreview";

interface HistoryPanelProps {
  directory: FileSystemDirectoryHandle;
  resumes: ResumeSummary[];
  initialResumeId: string;
  onClose: () => void;
  onCreateSnapshot: (resumeId: string) => Promise<void>;
  onRestoreAsNew: (resume: ResumeDocument) => Promise<void>;
  onReplaceResume: (resumeId: string, resume: ResumeDocument) => Promise<void>;
}

const formatDate = (timestamp: number) => new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
}).format(timestamp);

const formatSize = (size: number) => size < 1024
  ? `${size} B`
  : `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;

export function HistoryPanel({
  directory,
  resumes,
  initialResumeId,
  onClose,
  onCreateSnapshot,
  onRestoreAsNew,
  onReplaceResume,
}: HistoryPanelProps) {
  const [resumeId, setResumeId] = useState(initialResumeId);
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listHistorySnapshots(directory, resumeId).then((value) => {
      if (!active) return;
      setSnapshots(value);
      setSelectedFile((current) => value.some((item) => item.fileName === current) ? current : value[0]?.fileName ?? "");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "读取历史版本失败");
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [directory, resumeId, revision]);

  const selected = snapshots.find((item) => item.fileName === selectedFile) ?? null;
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await operation();
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "历史版本操作失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-backdrop" role="presentation">
      <section className="history-page" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <header className="settings-header">
          <div>
            <span className="eyebrow">本地磁盘备份</span>
            <h2 id="history-title">历史版本</h2>
            <p>每份简历最多保留 20 个快照，选择版本后可在右侧完整预览。</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭历史版本">×</button>
        </header>

        <div className="history-toolbar">
          <label>
            <span>查看简历</span>
            <select value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
              {resumes.map((item) => <option value={item.id} key={item.id}>{item.title || "未命名简历"}</option>)}
            </select>
          </label>
          <button type="button" className="secondary-button" disabled={busy} onClick={() => void run(() => onCreateSnapshot(resumeId))}>立即创建历史版本</button>
        </div>

        <div className="history-content">
          <aside className="history-list" aria-label="历史快照列表">
            {loading && <div className="history-empty">正在读取历史版本……</div>}
            {!loading && !snapshots.length && <div className="history-empty">这份简历还没有历史快照。</div>}
            {snapshots.map((snapshot) => (
              <div className={`history-row ${snapshot.fileName === selectedFile ? "selected" : ""}`} key={snapshot.fileName}>
                <button type="button" className="history-select" onClick={() => setSelectedFile(snapshot.fileName)}>
                  <strong>{formatDate(snapshot.savedAt)}</strong>
                  <span>{snapshot.resume.title || "未命名简历"}</span>
                  <small>{formatSize(snapshot.size)}</small>
                </button>
                <button
                  type="button"
                  className="icon-button danger-text"
                  title="删除历史版本"
                  aria-label={`删除 ${formatDate(snapshot.savedAt)} 的历史版本`}
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm("确定删除这个历史版本吗？删除后无法恢复。")) return;
                    void run(() => deleteHistorySnapshot(directory, resumeId, snapshot.fileName));
                  }}
                >×</button>
              </div>
            ))}
          </aside>

          <section className="history-preview" aria-label="历史简历预览">
            {selected ? <ResumePreview resume={selected.resume} zoom={70} onOverflowChange={() => undefined} /> : <div className="history-empty">选择一个历史版本以预览。</div>}
          </section>
        </div>

        <footer className="history-footer">
          <span>{error || (selected ? `快照时间：${formatDate(selected.savedAt)}` : "不会修改当前简历，直到你选择恢复方式。")}</span>
          <div className="setting-actions">
            <button type="button" className="secondary-button" disabled={!selected || busy} onClick={() => selected && void run(() => onRestoreAsNew(selected.resume))}>恢复为新简历</button>
            <button
              type="button"
              className="primary-button"
              disabled={!selected || busy}
              onClick={() => {
                if (!selected || !window.confirm("确定用这个历史版本覆盖所选简历吗？当前内容会先由自动备份流程保留。")) return;
                void run(() => onReplaceResume(resumeId, selected.resume));
              }}
            >覆盖所选简历</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
