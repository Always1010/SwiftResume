import type { DiskBackupStatus } from "../storage/diskBackup";

interface BackupSetupPromptProps {
  status: DiskBackupStatus;
  directoryName: string;
  onChooseDirectory: () => void;
  onAuthorizeDirectory: () => void;
  onLater: () => void;
}

export function BackupSetupPrompt({
  status,
  directoryName,
  onChooseDirectory,
  onAuthorizeDirectory,
  onLater,
}: BackupSetupPromptProps) {
  const canAuthorize = Boolean(directoryName) && (status === "permission-required" || status === "error");
  const title = status === "error" ? "磁盘备份未完成" : status === "permission-required" ? "磁盘备份待授权" : "建议设置磁盘备份";
  return (
    <aside className="backup-notice" aria-label="磁盘备份提醒">
      <div className="backup-notice-copy">
        <strong>{title}</strong>
        <span>{status === "error"
          ? "最近的修改尚未确认备份到磁盘，可在设置中重试。"
          : status === "permission-required"
            ? `重新授权“${directoryName || "原目录"}”后继续自动备份。`
            : "当前仅保存在浏览器，清理浏览器数据可能丢失简历。"}</span>
        <details className="backup-notice-details">
          <summary>了解备份</summary>
          <p>选择本地目录后，编辑会自动生成磁盘副本。也可在设置中导出 JSON 备份。“本次稍后”仅收起当前页面的提醒；下次打开时若仍未配置或授权，会再次提醒。可随时从“设置与备份”管理目录和恢复数据。</p>
        </details>
      </div>
      <div className="backup-notice-actions">
        <button type="button" className="text-button" onClick={onLater}>本次稍后</button>
        <button type="button" className="secondary-button" onClick={canAuthorize ? onAuthorizeDirectory : onChooseDirectory}>
          {canAuthorize ? "重新授权" : "选择备份目录"}
        </button>
      </div>
    </aside>
  );
}
