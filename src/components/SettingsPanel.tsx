import type {
  AppSettings,
  ExportEngine,
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
  onOpenHistory,
}: SettingsPanelProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-page" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-header">
          <div>
            <span className="eyebrow">SwiftResume</span>
            <h2 id="settings-title">设置</h2>
            <p>调整多页面协作、保存、导出和预览行为。</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭设置">×</button>
        </header>

        <div className="settings-content">
          <div className="settings-group">
            <div className="settings-group-title"><span>01</span><div><h3>多页面协作</h3><p>控制多个 SwiftResume 标签页之间的数据流动。</p></div></div>
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
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><span>02</span><div><h3>保存与导出</h3><p>内容仅保存在本机，不会上传到服务器。</p></div></div>
            <label className="setting-row">
              <div><strong>自动保存延迟</strong><p>停止编辑后等待多久写入本地数据库。</p></div>
              <select value={settings.saveDelayMs} onChange={(event) => update("saveDelayMs", Number(event.target.value) as SaveDelay)}>
                <option value={300}>300 毫秒</option>
                <option value={500}>500 毫秒</option>
                <option value={1000}>1 秒</option>
              </select>
            </label>
            <label className="setting-row">
              <div><strong>PDF 导出方式</strong><p>Typst 生成可复制的矢量 PDF；浏览器打印可作为兼容模式。</p></div>
              <select value={settings.exportEngine} onChange={(event) => update("exportEngine", event.target.value as ExportEngine)}>
                <option value="typst">Typst PDF</option>
                <option value="browser">浏览器打印</option>
              </select>
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><span>03</span><div><h3>编辑预览</h3><p>只影响工作台显示，不改变 PDF 页面尺寸。</p></div></div>
            <div className="setting-row">
              <div><strong>预览页数</strong><p>在预览工具栏中显示当前简历的实际 A4 页数。</p></div>
              <Toggle label="预览页数" checked={settings.showOverflowWarning} onChange={(value) => update("showOverflowWarning", value)} />
            </div>
            <label className="setting-row">
              <div><strong>预览缩放</strong><p>在较小屏幕上缩小页面，减少横向滚动。</p></div>
              <select value={settings.previewZoom} onChange={(event) => update("previewZoom", Number(event.target.value) as PreviewZoom)}>
                <option value={70}>70%</option>
                <option value={80}>80%</option>
                <option value={90}>90%</option>
                <option value={100}>100%</option>
              </select>
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-group-title"><span>04</span><div><h3>本地磁盘备份</h3><p>将浏览器内的简历自动镜像到你授权的本地目录。</p></div></div>
            <div className={`setting-row ${!backupSupported ? "setting-disabled" : ""}`}>
              <div><strong>自动磁盘备份</strong><p>{backupStatusLabels[backupStatus]}</p></div>
              <Toggle label="自动磁盘备份" checked={settings.diskBackupEnabled && backupSupported} onChange={(value) => update("diskBackupEnabled", value)} />
            </div>
            <div className="setting-row backup-directory-row">
              <div><strong>备份目录</strong><p>{backupDirectoryName || "选择 D 盘、移动磁盘或其他可访问目录。"}</p></div>
              <div className="setting-actions">
                {backupStatus === "permission-required" && <button type="button" className="secondary-button" onClick={onAuthorizeBackupDirectory}>重新授权</button>}
                <button type="button" className="secondary-button" disabled={!backupSupported} onClick={onChooseBackupDirectory}>{backupDirectoryName ? "更换目录" : "选择目录"}</button>
              </div>
            </div>
            <div className="setting-row">
              <div><strong>备份与恢复</strong><p>最新版本保存在 resumes，独立图片保存在 assets，历史快照保存在 history。</p></div>
              <div className="setting-actions">
                <button type="button" className="secondary-button" disabled={!backupDirectoryName || backupStatus !== "ready"} onClick={onOpenHistory}>历史版本</button>
                <button type="button" className="secondary-button" disabled={!backupDirectoryName} onClick={onRestoreBackup}>从目录恢复</button>
                <button type="button" className="primary-button" disabled={!backupDirectoryName || backupStatus === "permission-required"} onClick={onBackupNow}>立即备份</button>
              </div>
            </div>
          </div>
        </div>

        <footer className="settings-footer">
          <span>设置会自动保存，并应用于所有 SwiftResume 页面。</span>
          <button type="button" className="primary-button" onClick={onClose}>完成</button>
        </footer>
      </section>
    </div>
  );
}
