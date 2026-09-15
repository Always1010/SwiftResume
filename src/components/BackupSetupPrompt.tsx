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
  const needsAuthorization = status === "permission-required" || status === "error";
  return (
    <div className="backup-prompt-backdrop" role="presentation">
      <section className="backup-prompt" role="alertdialog" aria-modal="true" aria-labelledby="backup-prompt-title" aria-describedby="backup-prompt-description">
        <span className="backup-prompt-icon">↧</span>
        <span className="eyebrow">数据安全提醒</span>
        <h2 id="backup-prompt-title">{needsAuthorization ? "磁盘备份需要重新授权" : "尚未设置磁盘备份目录"}</h2>
        <p id="backup-prompt-description">
          {needsAuthorization
            ? `已记住备份目录${directoryName ? `“${directoryName}”` : ""}，但浏览器当前没有读写权限。重新授权后会继续自动备份，无需再次选择目录。`
            : "当前简历只保存在浏览器数据库中。建议选择一个本地目录，在每次编辑后自动保存磁盘副本。"}
        </p>
        <div className="backup-prompt-actions">
          <button type="button" className="secondary-button" onClick={onLater}>本次稍后处理</button>
          {needsAuthorization && directoryName && <button type="button" className="primary-button" onClick={onAuthorizeDirectory}>重新授权原目录</button>}
          <button type="button" className={needsAuthorization && directoryName ? "secondary-button" : "primary-button"} onClick={onChooseDirectory}>
            {directoryName ? "选择其他目录" : "选择备份目录"}
          </button>
        </div>
        <small>选择“稍后”只关闭本次提醒，下次打开页面仍会检查备份状态。</small>
      </section>
    </div>
  );
}
