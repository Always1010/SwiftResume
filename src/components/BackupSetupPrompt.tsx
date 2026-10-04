import { useRef, useState } from "react";
import type { DiskBackupStatus } from "../storage/diskBackup";
import { Modal } from "./Modal";

interface BackupSetupPromptProps {
  status: DiskBackupStatus;
  directoryName: string;
  onChooseDirectory: () => void | Promise<void>;
  onAuthorizeDirectory: () => void | Promise<void>;
  onLater: () => void;
}

export function BackupSetupPrompt({
  status,
  directoryName,
  onChooseDirectory,
  onAuthorizeDirectory,
  onLater,
}: BackupSetupPromptProps) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const canAuthorize = Boolean(directoryName) && (status === "permission-required" || status === "error");
  const title = status === "error" ? "磁盘备份未完成" : status === "permission-required" ? "磁盘备份需要重新授权" : "建议设置本地备份目录";
  const later = () => { if (!busyRef.current) onLater(); };
  const run = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await (canAuthorize ? onAuthorizeDirectory() : onChooseDirectory()); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return (
    <Modal titleId="backup-prompt-title" descriptionId="backup-prompt-description" className="flow-dialog backup-prompt" onClose={later} waitForOtherModals>
      <header className="workspace-dialog-header"><h2 id="backup-prompt-title">{title}</h2></header>
      <p id="backup-prompt-description" className="backup-prompt-description">{status === "error"
        ? "最近的修改尚未确认备份到磁盘。请重试或在设置中更换目录。"
        : status === "permission-required"
          ? `已记住“${directoryName || "原目录"}”，重新授权后才能继续自动备份。`
          : "当前简历只保存在浏览器中，清理浏览器数据或卸载扩展可能丢失简历。建议选择一个本地目录，保留独立的磁盘副本。"}</p>
      <p className="flow-muted">“本次稍后”只跳过本次提醒；下次打开时会重新检查。也可随时从“设置与备份”管理目录。</p>
      <footer className="backup-prompt-actions">
        <button type="button" className="secondary-button" onClick={later} disabled={busy}>本次稍后</button>
        <button type="button" className="primary-button" onClick={() => void run()} disabled={busy}>
          {busy ? "处理中…" : canAuthorize ? "重新授权" : "选择备份目录"}
        </button>
      </footer>
    </Modal>
  );
}
