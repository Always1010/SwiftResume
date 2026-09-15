import type {
  AppSettings,
  ExportEngine,
  PreviewZoom,
  SaveDelay,
  SyncDelay,
} from "../settings/appSettings";

interface SettingsPanelProps {
  settings: AppSettings;
  syncSupported: boolean;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
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

export function SettingsPanel({ settings, syncSupported, onChange, onClose }: SettingsPanelProps) {
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
              <div><strong>一页溢出提示</strong><p>内容超过当前 A4 页面时显示醒目提醒。</p></div>
              <Toggle label="一页溢出提示" checked={settings.showOverflowWarning} onChange={(value) => update("showOverflowWarning", value)} />
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
        </div>

        <footer className="settings-footer">
          <span>设置会自动保存，并应用于所有 SwiftResume 页面。</span>
          <button type="button" className="primary-button" onClick={onClose}>完成</button>
        </footer>
      </section>
    </div>
  );
}
