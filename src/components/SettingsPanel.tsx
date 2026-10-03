import { useState } from "react";
import { Modal } from "./Modal";
import { CloseButton } from "./CloseButton";
import type {
  AppSettings,
  PreviewZoom,
  SaveDelay,
  SyncDelay,
} from "../settings/appSettings";
import type { DiskBackupStatus } from "../storage/diskBackup";

interface SettingsPanelProps {
  settings: AppSettings;
  syncSupported: boolean;
  backupSupported: boolean;
  backupStatus: DiskBackupStatus;
  backupDirectoryName: string;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
  onChooseBackupDirectory: () => void;
  onAuthorizeBackupDirectory: () => void;
  onBackupNow: () => void;
  onRestoreBackup: () => void;
  onOpenHistory: () => void;
  onExportResume: () => void;
  onExportLibrary: () => void;
  onImportBackup: () => void;
  onImportText: () => void;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? "checked" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

const backupStatusLabels: Record<DiskBackupStatus, string> = {
  unsupported: "当前浏览器不支持直接写入本地目录。",
  "not-configured": "尚未选择备份目录。",
  "permission-required": "目录已记录，需要重新授予读写权限。",
  ready: "浏览器缓存和磁盘备份均可正常使用。",
  saving: "正在写入磁盘备份……",
  error: "最近一次磁盘备份失败，请重新选择目录或授权。",
};

export function SettingsPanel({
  settings,
  syncSupported,
  backupSupported,
  backupStatus,
  backupDirectoryName,
  onChange,
  onClose,
  onChooseBackupDirectory,
  onAuthorizeBackupDirectory,
  onBackupNow,
  onRestoreBackup,
  onOpenHistory, onExportResume, onExportLibrary, onImportBackup, onImportText,
}: SettingsPanelProps) {
  const [section, setSection] = useState<"files" | "writing" | "advanced">("files");
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <Modal titleId="settings-title" className="settings-page" onClose={onClose}>
        <header className="settings-header">
          <div>
            <h2 id="settings-title">设置与备份</h2>
            <p>所有设置自动保存</p>
          </div>
          <CloseButton onClick={onClose} label="关闭设置" />
        </header>

        <nav className="settings-navigation" aria-label="设置分类">
          {([{ id: "files", label: "导入与备份" }, { id: "writing", label: "编辑与导出" }, { id: "advanced", label: "高级设置" }] as const).map((item) => (
            <button key={item.id} type="button" aria-pressed={section === item.id} aria-controls={`settings-${item.id}`} onClick={() => setSection(item.id)}>{item.label}</button>
          ))}
        </nav>
        <div className="settings-content">
          <section id="settings-files" aria-label="导入与备份" hidden={section !== "files"}>
          <section className="settings-group">
            <div className="settings-group-title"><h3>导入与备份</h3></div>
            <div className="settings-file-tools">
              <button type="button" className="secondary-button" onClick={onImportText}>粘贴已有简历</button>
              <button type="button" className="secondary-button" onClick={onImportBackup}>导入 JSON 备份</button>
              <button type="button" className="secondary-button" onClick={onExportResume}>备份当前简历</button>
              <button type="button" className="secondary-button" onClick={onExportLibrary}>备份全部简历</button>
            </div>
          </section>
          <div className="settings-group">
            <div className="settings-group-title"><div><h3>本地磁盘备份</h3><p>浏览器内自动保存与磁盘备份是两份数据。清理浏览器数据或卸载扩展可能丢失未备份的简历。</p></div></div>
            <div className={`setting-row ${!backupSupported ? "setting-disabled" : ""}`}>
              <div><strong>自动磁盘备份</strong><p>{settings.diskBackupEnabled ? backupStatusLabels[backupStatus] : "已关闭；浏览器内仍会自动保存。"}</p></div>
              <Toggle label="自动磁盘备份" checked={settings.diskBackupEnabled && backupSupported} onChange={(value) => update("diskBackupEnabled", value)} />
            </div>
            <div className="setting-row backup-directory-row">
              <div><strong>备份目录</strong><p>{backupDirectoryName || "选择本机或移动磁盘中的目录。"}</p></div>
              <div className="setting-actions">
                {(backupStatus === "permission-required" || backupStatus === "error") && Boolean(backupDirectoryName) && <button type="button" className="secondary-button" onClick={onAuthorizeBackupDirectory}>重新授权</button>}
                <button type="button" className="secondary-button" disabled={!backupSupported} onClick={onChooseBackupDirectory}>{backupDirectoryName ? "更换目录" : "选择目录"}</button>
              </div>
            </div>
            <div className="setting-row">
              <div><strong>备份与恢复</strong><p>从磁盘备份找回内容。</p></div>
              <div className="setting-actions">
                <button type="button" className="secondary-button" disabled={!backupDirectoryName || backupStatus !== "ready"} onClick={onOpenHistory}>历史版本</button>
                <button type="button" className="secondary-button" disabled={!backupDirectoryName} onClick={onRestoreBackup}>从目录恢复</button>
                <button type="button" className="primary-button" disabled={!backupDirectoryName || backupStatus === "permission-required"} onClick={onBackupNow}>立即备份</button>
              </div>
            </div>
          </div>
          </section>
          <section id="settings-writing" aria-label="编辑与导出" hidden={section !== "writing"}>
          <div className="settings-group">
            <div className="settings-group-title"><div><h3>保存与导出</h3><p>内容仅保存在本机，不会上传到服务器。</p></div></div>
            <label className="setting-row">
              <div><strong>自动保存延迟</strong><p>停止编辑后等待多久写入本地数据库。</p></div>
              <select value={settings.saveDelayMs} onChange={(event) => update("saveDelayMs", Number(event.target.value) as SaveDelay)}>
                <option value={300}>300 毫秒</option>
                <option value={500}>500 毫秒</option>
                <option value={1000}>1 秒</option>
              </select>
            </label>
            <label className="setting-row"><div><strong>预览与 PDF 输出方式</strong><p>同时应用于右侧预览、模板预览、模板切换、导出和打印。HTML/CSS 通过浏览器另存为 PDF；Typst 直接下载 PDF。</p></div>
              <select aria-label="预览与 PDF 输出方式" value={settings.outputEngine} onChange={(event) => update("outputEngine", event.target.value === "typst" ? "typst" : "html")}>
                <option value="html">HTML/CSS（默认）</option><option value="typst">Typst</option>
              </select>
            </label>
          </div>

          <details className="settings-group settings-advanced">
            <summary>编辑预览</summary>
            <div className="setting-row">
              <div><strong>预览页数</strong><p>在预览工具栏中显示当前简历的实际 A4 页数。</p></div>
              <Toggle label="预览页数" checked={settings.showOverflowWarning} onChange={(value) => update("showOverflowWarning", value)} />
            </div>
            <label className="setting-row">
              <div><strong>预览缩放</strong><p>调整编辑时右侧预览的显示大小。</p></div>
              <select value={settings.previewZoom} onChange={(event) => update("previewZoom", event.target.value === "fit" ? "fit" : Number(event.target.value) as PreviewZoom)}>
                <option value="fit">适应宽度</option>
                <option value={70}>70%</option>
                <option value={80}>80%</option>
                <option value={90}>90%</option>
                <option value={100}>100%</option>
              </select>
            </label>
          </details>

          </section>
          <section id="settings-advanced" aria-label="高级设置" hidden={section !== "advanced"}>
          <details className="settings-group settings-advanced">
            <summary>多页面同步</summary>
            <div className="setting-row">
              <div><strong>实时页面同步</strong><p>{syncSupported ? "当前页面的每次修改都会同步到其他已打开页面。" : "当前浏览器不支持 BroadcastChannel。"}</p></div>
              <Toggle label="实时页面同步" checked={settings.liveSync && syncSupported} onChange={(value) => update("liveSync", value)} />
            </div>
            <label className={`setting-row ${!settings.liveSync ? "setting-disabled" : ""}`}>
              <div><strong>同步延迟</strong><p>即时最流畅；较长延迟适合连续输入大量内容。</p></div>
              <select disabled={!settings.liveSync} value={settings.syncDelayMs} onChange={(event) => update("syncDelayMs", Number(event.target.value) as SyncDelay)}>
                <option value={0}>即时同步</option>
                <option value={100}>100 毫秒</option>
                <option value={300}>300 毫秒</option>
              </select>
            </label>
          </details>

          </section>
        </div>

    </Modal>
  );
}
